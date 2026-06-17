import { loadConfig } from '@smriti/config';
import { TOPICS } from '@smriti/events';
import { createKafka, KafkaProducer } from '@smriti/kafka';
import { createLogger, registerShutdown } from '@smriti/observability';
import { createDb, PostgresMemoryRepository } from '@smriti/postgres';

const SUMMARIZE_INTERVAL_MS = Number(process.env.SCHEDULE_SUMMARIZE_MS ?? 5 * 60 * 1000);
const CONSOLIDATE_INTERVAL_MS = Number(process.env.SCHEDULE_CONSOLIDATE_MS ?? 15 * 60 * 1000);

/**
 * Emits periodic per-user trigger events. Workers (summarizer, consolidation)
 * consume these. Keeping scheduling here means the heavy work stays off the
 * request path and is driven by a single, observable cron-like service.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ service: `${config.otel.serviceName}-scheduler` });

  const { db } = createDb({ url: config.postgres.url, poolSize: config.postgres.poolSize });
  const memories = new PostgresMemoryRepository(db);

  const kafka = createKafka({ brokers: config.kafka.brokers, clientId: config.kafka.clientId });
  const producer = new KafkaProducer(kafka);
  await producer.connect();

  const fanOut = async (eventName: string): Promise<void> => {
    const userIds = await memories.distinctActiveUserIds();
    await Promise.all(
      userIds.map((userId) =>
        producer.publish({ eventName, partitionKey: userId, payload: { userId } }),
      ),
    );
    logger.info({ eventName, users: userIds.length }, 'scheduled fan-out');
  };

  const summarizeTimer = setInterval(() => {
    void fanOut(TOPICS.scheduleSummarize).catch((error) =>
      logger.error({ err: String(error) }, 'summarize fan-out failed'),
    );
  }, SUMMARIZE_INTERVAL_MS);

  const consolidateTimer = setInterval(() => {
    void fanOut(TOPICS.scheduleConsolidate).catch((error) =>
      logger.error({ err: String(error) }, 'consolidate fan-out failed'),
    );
  }, CONSOLIDATE_INTERVAL_MS);

  logger.info(
    { summarizeMs: SUMMARIZE_INTERVAL_MS, consolidateMs: CONSOLIDATE_INTERVAL_MS },
    'scheduler started',
  );

  registerShutdown(async () => {
    clearInterval(summarizeTimer);
    clearInterval(consolidateTimer);
    await producer.disconnect();
    await db.destroy();
  }, logger);
}

main().catch((error) => {
  console.error('Failed to start scheduler:', error);
  process.exit(1);
});
