import amqplib from 'amqplib';
import { createRabbitMQClient, MAIN_QUEUE } from './rabbitmq-client.js';

jest.mock('amqplib');

function fakeMessage(content: unknown, headers: Record<string, unknown> = {}) {
  return {
    content: Buffer.from(JSON.stringify(content)),
    properties: { headers },
  };
}

// Microtask-only flush (never a macrotask like setImmediate/setTimeout) so it works whether
// or not the test has fake timers active.
function flush(): Promise<void> {
  return Promise.resolve()
    .then(() => Promise.resolve())
    .then(() => Promise.resolve());
}

describe('createRabbitMQClient', () => {
  let channel: {
    prefetch: jest.Mock;
    assertExchange: jest.Mock;
    assertQueue: jest.Mock;
    bindQueue: jest.Mock;
    consume: jest.Mock;
    ack: jest.Mock;
    nack: jest.Mock;
    sendToQueue: jest.Mock;
    get: jest.Mock;
    checkQueue: jest.Mock;
    purgeQueue: jest.Mock;
    close: jest.Mock;
  };
  let connection: { createChannel: jest.Mock; on: jest.Mock; close: jest.Mock };

  beforeEach(() => {
    channel = {
      prefetch: jest.fn(),
      assertExchange: jest.fn(),
      assertQueue: jest.fn(),
      bindQueue: jest.fn(),
      consume: jest.fn(),
      ack: jest.fn(),
      nack: jest.fn(),
      sendToQueue: jest.fn(),
      get: jest.fn(),
      checkQueue: jest.fn().mockResolvedValue({ messageCount: 0 }),
      purgeQueue: jest.fn().mockResolvedValue({ messageCount: 0 }),
      close: jest.fn(),
    };
    connection = {
      createChannel: jest.fn().mockResolvedValue(channel),
      on: jest.fn(),
      close: jest.fn(),
    };
    (amqplib.connect as jest.Mock) = jest.fn().mockResolvedValue(connection);
  });

  it('declares the DLX/DLQ topology and the main queue with matching dead-letter arguments', async () => {
    const client = createRabbitMQClient({
      url: 'amqp://localhost',
      maxRetries: 3,
    });
    await client.connect();

    expect(channel.assertExchange).toHaveBeenCalledWith(
      'carrier.bind.dlx',
      'direct',
      { durable: true },
    );
    expect(channel.assertQueue).toHaveBeenCalledWith(
      'carrier.bind.requested.dlq',
      { durable: true },
    );
    expect(channel.bindQueue).toHaveBeenCalledWith(
      'carrier.bind.requested.dlq',
      'carrier.bind.dlx',
      'carrier.bind.dead',
    );
    expect(channel.assertQueue).toHaveBeenCalledWith(MAIN_QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': 'carrier.bind.dlx',
        'x-dead-letter-routing-key': 'carrier.bind.dead',
      },
    });
    expect(channel.prefetch).toHaveBeenCalledWith(1);
  });

  it('acks the message when the handler succeeds', async () => {
    const client = createRabbitMQClient({
      url: 'amqp://localhost',
      maxRetries: 3,
    });
    await client.connect();

    const handler = jest.fn().mockResolvedValue(undefined);
    await client.consume(handler);
    const onMessage = channel.consume.mock.calls[0][1];

    const msg = fakeMessage({ jobId: 'j1' });
    onMessage(msg);
    await flush();

    expect(handler).toHaveBeenCalledWith(msg.content.toString(), 0, 3);
    expect(channel.ack).toHaveBeenCalledWith(msg);
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('republishes with an incremented retry count and acks the original when under maxRetries', async () => {
    jest.useFakeTimers();
    try {
      const client = createRabbitMQClient({
        url: 'amqp://localhost',
        maxRetries: 3,
      });
      await client.connect();

      const handler = jest.fn().mockRejectedValue(new Error('boom'));
      await client.consume(handler);
      const onMessage = channel.consume.mock.calls[0][1];

      const msg = fakeMessage({ jobId: 'j1' }, { 'x-retry-count': 1 });
      onMessage(msg);
      await flush();
      // The retry path waits out a backoff delay before republishing.
      await jest.runAllTimersAsync();

      expect(channel.sendToQueue).toHaveBeenCalledWith(
        MAIN_QUEUE,
        msg.content,
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-retry-count': 2 }),
        }),
      );
      expect(channel.ack).toHaveBeenCalledWith(msg);
      expect(channel.nack).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('nacks without requeue once retries are exhausted, routing to the DLQ', async () => {
    const client = createRabbitMQClient({
      url: 'amqp://localhost',
      maxRetries: 3,
    });
    await client.connect();

    const handler = jest.fn().mockRejectedValue(new Error('boom'));
    await client.consume(handler);
    const onMessage = channel.consume.mock.calls[0][1];

    const msg = fakeMessage({ jobId: 'j1' }, { 'x-retry-count': 3 });
    onMessage(msg);
    await flush();

    expect(channel.nack).toHaveBeenCalledWith(msg, false, false);
    expect(channel.sendToQueue).not.toHaveBeenCalled();
    expect(channel.ack).not.toHaveBeenCalled();
  });

  it('checkDlqDepth returns the DLQ message count', async () => {
    channel.checkQueue.mockResolvedValue({ messageCount: 4 });
    const client = createRabbitMQClient({
      url: 'amqp://localhost',
      maxRetries: 3,
    });
    await client.connect();

    await expect(client.checkDlqDepth()).resolves.toBe(4);
    expect(channel.checkQueue).toHaveBeenCalledWith(
      'carrier.bind.requested.dlq',
    );
  });

  it('peekDlq requeues every message it inspects (non-destructive)', async () => {
    const msg = fakeMessage({ jobId: 'j1' }, { 'x-retry-count': 2 });
    channel.checkQueue.mockResolvedValue({ messageCount: 1 });
    channel.get.mockResolvedValueOnce(msg);

    const client = createRabbitMQClient({
      url: 'amqp://localhost',
      maxRetries: 3,
    });
    await client.connect();

    const messages = await client.peekDlq(10);
    expect(messages).toEqual([
      { content: msg.content.toString(), retryCount: 2 },
    ]);
    expect(channel.nack).toHaveBeenCalledWith(msg, false, true);
  });

  it('peekDlq only fetches as many messages as the queue actually has, even with a larger limit', async () => {
    const msg = fakeMessage({ jobId: 'j1' }, { 'x-retry-count': 0 });
    channel.checkQueue.mockResolvedValue({ messageCount: 1 });
    channel.get.mockResolvedValueOnce(msg);

    const client = createRabbitMQClient({
      url: 'amqp://localhost',
      maxRetries: 3,
    });
    await client.connect();

    const messages = await client.peekDlq(50);
    expect(messages).toHaveLength(1);
    expect(channel.get).toHaveBeenCalledTimes(1);
  });

  it('replayDlq republishes to the main queue with retry count reset and acks the DLQ message', async () => {
    const msg = fakeMessage({ jobId: 'j1' }, { 'x-retry-count': 3 });
    channel.get.mockResolvedValueOnce(msg).mockResolvedValueOnce(false);

    const client = createRabbitMQClient({
      url: 'amqp://localhost',
      maxRetries: 3,
    });
    await client.connect();

    const replayed = await client.replayDlq(5);
    expect(replayed).toBe(1);
    expect(channel.sendToQueue).toHaveBeenCalledWith(
      MAIN_QUEUE,
      msg.content,
      expect.objectContaining({
        headers: expect.objectContaining({ 'x-retry-count': 0 }),
      }),
    );
    expect(channel.ack).toHaveBeenCalledWith(msg);
  });

  it('purgeDlq purges the DLQ and returns how many were removed', async () => {
    channel.purgeQueue.mockResolvedValue({ messageCount: 7 });
    const client = createRabbitMQClient({
      url: 'amqp://localhost',
      maxRetries: 3,
    });
    await client.connect();

    await expect(client.purgeDlq()).resolves.toBe(7);
    expect(channel.purgeQueue).toHaveBeenCalledWith(
      'carrier.bind.requested.dlq',
    );
  });
});
