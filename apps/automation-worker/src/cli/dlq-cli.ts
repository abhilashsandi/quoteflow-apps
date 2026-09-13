import { env } from '../env.js';
import { createRabbitMQClient } from '../worker/rabbitmq-client.js';

const USAGE = `Usage: dlq-cli <command> [count]

Commands:
  depth            Print how many messages are sitting in the dead-letter queue.
  list [count]     Print up to <count> (default 10) DLQ messages without removing them.
  replay [count]   Move up to <count> (default 1) DLQ messages back onto the main queue,
                   with their retry count reset to 0.
  purge            Permanently delete every message in the DLQ.
`;

async function main(): Promise<void> {
  const [command, countArg] = process.argv.slice(2);
  if (!command) {
    console.log(USAGE);
    process.exit(1);
  }

  const rabbitMQ = createRabbitMQClient({
    url: env.RABBITMQ_URL,
    maxRetries: env.MAX_RETRIES,
  });
  await rabbitMQ.connect();

  try {
    switch (command) {
      case 'depth': {
        const depth = await rabbitMQ.checkDlqDepth();
        console.log(`DLQ depth: ${depth}`);
        break;
      }
      case 'list': {
        const limit = countArg ? Number(countArg) : 10;
        const messages = await rabbitMQ.peekDlq(limit);
        if (messages.length === 0) {
          console.log('DLQ is empty.');
          break;
        }
        messages.forEach((msg, i) => {
          console.log(
            `--- [${i + 1}/${messages.length}] retryCount=${msg.retryCount} ---`,
          );
          console.log(msg.content);
        });
        break;
      }
      case 'replay': {
        const limit = countArg ? Number(countArg) : 1;
        const replayed = await rabbitMQ.replayDlq(limit);
        console.log(
          `Replayed ${replayed} message(s) back onto the main queue.`,
        );
        break;
      }
      case 'purge': {
        const purged = await rabbitMQ.purgeDlq();
        console.log(`Purged ${purged} message(s) from the DLQ.`);
        break;
      }
      default: {
        console.log(USAGE);
        process.exitCode = 1;
      }
    }
  } finally {
    await rabbitMQ.disconnect();
  }
}

main().catch((err: unknown) => {
  console.error('dlq-cli failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
