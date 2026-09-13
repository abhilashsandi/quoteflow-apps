import amqplib, { type Channel, type ChannelModel } from 'amqplib';
import { logger } from '../logger.js';

/** The subset of amqplib's ConsumeMessage/GetMessage shapes retryCountOf actually needs —
 * channel.get() and channel.consume() return slightly different message types, but both
 * carry this. */
type MessageWithHeaders = { properties: { headers?: Record<string, unknown> } };

/** Must match quoteflow-rating-service's queue/rabbitmq.ts exactly — see that file's comment
 * for why (RabbitMQ requires every assertQueue/assertExchange call for a given name to agree
 * on arguments, and either service may boot first). */
export const MAIN_QUEUE = 'carrier.bind.requested';
const DLX_EXCHANGE = 'carrier.bind.dlx';
const DLQ_QUEUE = 'carrier.bind.requested.dlq';
const DLQ_ROUTING_KEY = 'carrier.bind.dead';

export interface RabbitMQClientOptions {
  url: string;
  maxRetries: number;
}

/** `retryCount` is this delivery's attempt number (0 on the first try); `maxRetries` is
 * echoed back so a handler can tell whether THIS failure is the one that will exhaust
 * retries and go to the DLQ, without needing to know the client's own retry bookkeeping. */
export type BindJobHandler = (
  content: string,
  retryCount: number,
  maxRetries: number,
) => Promise<void>;

export interface DlqMessage {
  content: string;
  retryCount: number;
}

export interface RabbitMQClient {
  connect(): Promise<void>;
  consume(handler: BindJobHandler): Promise<void>;
  checkDlqDepth(): Promise<number>;
  /** Non-destructive: every message it looks at is requeued (order is not preserved). */
  peekDlq(limit: number): Promise<DlqMessage[]>;
  /** Removes up to `limit` messages from the DLQ and republishes each to the main queue with
   * a reset retry count — a fresh attempt, not a continuation of the exhausted one. Returns
   * how many were actually replayed. */
  replayDlq(limit: number): Promise<number>;
  /** Returns how many messages were purged. */
  purgeDlq(): Promise<number>;
  disconnect(): Promise<void>;
}

/**
 * Mirrors the retry/DLQ pattern used by this project's playx reference: prefetch(1) so jobs
 * process one at a time, a custom `x-retry-count` header (not RabbitMQ's own x-death, so the
 * count survives the ack+republish retry style below rather than only incrementing on an
 * actual dead-letter), and `nack(msg, false, false)` once retries are exhausted so the main
 * queue's own `x-dead-letter-exchange` argument routes the message to the DLQ.
 */
export function createRabbitMQClient(
  options: RabbitMQClientOptions,
): RabbitMQClient {
  let connection: ChannelModel | null = null;
  let channel: Channel | null = null;

  function requireChannel(): Channel {
    if (!channel)
      throw new Error(
        'RabbitMQ channel not initialized — call connect() first',
      );
    return channel;
  }

  async function connect(): Promise<void> {
    connection = await amqplib.connect(options.url);
    channel = await connection.createChannel();
    await channel.prefetch(1);

    await channel.assertExchange(DLX_EXCHANGE, 'direct', { durable: true });
    await channel.assertQueue(DLQ_QUEUE, { durable: true });
    await channel.bindQueue(DLQ_QUEUE, DLX_EXCHANGE, DLQ_ROUTING_KEY);

    await channel.assertQueue(MAIN_QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': DLX_EXCHANGE,
        'x-dead-letter-routing-key': DLQ_ROUTING_KEY,
      },
    });

    connection.on('close', () => logger.warn('RabbitMQ connection closed'));
    connection.on('error', (err) =>
      logger.error('RabbitMQ connection error', {
        message: (err as Error).message,
      }),
    );
  }

  function retryCountOf(msg: MessageWithHeaders): number {
    const headers = msg.properties.headers ?? {};
    return typeof headers['x-retry-count'] === 'number'
      ? (headers['x-retry-count'] as number)
      : 0;
  }

  async function consume(handler: BindJobHandler): Promise<void> {
    const ch = requireChannel();
    await ch.consume(MAIN_QUEUE, (msg) => {
      if (!msg) return;
      const content = msg.content.toString();
      const retryCount = retryCountOf(msg);

      handler(content, retryCount, options.maxRetries)
        .then(() => ch.ack(msg))
        .catch(async (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);

          if (retryCount >= options.maxRetries) {
            logger.error('Job exhausted retries, routing to DLQ', {
              maxRetries: options.maxRetries,
              message,
            });
            ch.nack(msg, false, false);
            return;
          }

          // Backoff before retrying: a transient failure (e.g. a dependency still starting
          // up) shouldn't get all its retries burned in the same instant. prefetch(1) means
          // RabbitMQ won't deliver another message on this channel while we sit here, so this
          // delay only throttles retries of the SAME failing job, never blocks other jobs.
          const backoffMs = Math.min(1000 * 2 ** retryCount, 10_000);
          logger.warn('Job failed, retrying after backoff', {
            nextAttempt: retryCount + 1,
            maxRetries: options.maxRetries,
            backoffMs,
            message,
          });
          await new Promise((resolve) => setTimeout(resolve, backoffMs));

          ch.sendToQueue(MAIN_QUEUE, msg.content, {
            persistent: true,
            headers: {
              ...msg.properties.headers,
              'x-retry-count': retryCount + 1,
            },
          });
          ch.ack(msg);
        });
    });
  }

  async function checkDlqDepth(): Promise<number> {
    const ch = requireChannel();
    const { messageCount } = await ch.checkQueue(DLQ_QUEUE);
    return messageCount;
  }

  async function peekDlq(limit: number): Promise<DlqMessage[]> {
    const ch = requireChannel();

    // RabbitMQ has no "snapshot without consuming" primitive, so this gets each message off
    // the queue first and only requeues them all at the end — nacking a message back
    // immediately (before moving on) would let the very next get() pull that same message
    // right back off the front, looping forever on a short queue instead of seeing every
    // distinct message.
    const { messageCount } = await ch.checkQueue(DLQ_QUEUE);
    const toFetch = Math.min(limit, messageCount);

    const fetched: Awaited<ReturnType<Channel['get']>>[] = [];
    for (let i = 0; i < toFetch; i++) {
      const msg = await ch.get(DLQ_QUEUE, { noAck: false });
      if (!msg) break;
      fetched.push(msg);
    }

    const seen = fetched
      .filter((msg): msg is Exclude<typeof msg, false> => msg !== false)
      .map((msg) => ({
        content: msg.content.toString(),
        retryCount: retryCountOf(msg),
      }));

    fetched.forEach((msg) => {
      if (msg) ch.nack(msg, false, true);
    });

    return seen;
  }

  async function replayDlq(limit: number): Promise<number> {
    const ch = requireChannel();
    let replayed = 0;
    for (let i = 0; i < limit; i++) {
      const msg = await ch.get(DLQ_QUEUE, { noAck: false });
      if (!msg) break;
      ch.sendToQueue(MAIN_QUEUE, msg.content, {
        persistent: true,
        headers: { ...msg.properties.headers, 'x-retry-count': 0 },
      });
      ch.ack(msg);
      replayed++;
    }
    return replayed;
  }

  async function purgeDlq(): Promise<number> {
    const ch = requireChannel();
    const { messageCount } = await ch.purgeQueue(DLQ_QUEUE);
    return messageCount;
  }

  async function disconnect(): Promise<void> {
    try {
      await channel?.close();
      await connection?.close();
    } catch {
      // Ignore errors during shutdown — the connection may already be closed.
    } finally {
      channel = null;
      connection = null;
    }
  }

  return {
    connect,
    consume,
    checkDlqDepth,
    peekDlq,
    replayDlq,
    purgeDlq,
    disconnect,
  };
}
