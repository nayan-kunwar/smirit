import { loadConfig } from '@smriti/config';
import { summaryGeneratedSchema, TOPICS, type SummaryGeneratedEvent } from '@smriti/events';
import { ConsumerRuntime, createKafka, KafkaProducer } from '@smriti/kafka';
import { deriveProfile } from '@smriti/memory-core';
import { createLogger, getMetrics, registerShutdown } from '@smriti/observability';
import {
  createDb,
  PostgresMemoryRepository,
  PostgresProcessedEventsRepository,
  PostgresProfileRepository,
  PostgresSummaryRepository,
} from '@smriti/postgres';

const GROUP = 'profile-worker';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ service: `${config.otel.serviceName}-profile-worker` });
  const metrics = getMetrics();

  const { db } = createDb({ url: config.postgres.url, poolSize: config.postgres.poolSize });
  const memories = new PostgresMemoryRepository(db);
  const summaries = new PostgresSummaryRepository(db);
  const profiles = new PostgresProfileRepository(db);
  const processed = new PostgresProcessedEventsRepository(db);

  const kafka = createKafka({ brokers: config.kafka.brokers, clientId: config.kafka.clientId });
  const producer = new KafkaProducer(kafka);

  const runtime = new ConsumerRuntime<SummaryGeneratedEvent>({
    kafka,
    producer,
    topic: TOPICS.summaryGenerated,
    groupId: GROUP,
    idempotency: processed,
    logger,
    metrics,
    validate: (value) => summaryGeneratedSchema.parse(value) as SummaryGeneratedEvent,
    handler: async (event) => {
      const { userId } = event.payload;
      const recent = await memories.listByUser(userId, { limit: 200, offset: 0 });
      const [latestSummary] = await summaries.latestForUser(userId, 1);

      const profile = deriveProfile(
        recent.map((memory) => memory.content),
        latestSummary?.summary,
      );
      await profiles.upsert(userId, profile);

      await producer.publish({
        eventName: TOPICS.profileGenerated,
        partitionKey: userId,
        payload: { userId },
        traceparent: event.traceparent,
      });
    },
  });

  await runtime.start();
  registerShutdown(async () => {
    await runtime.stop();
    await producer.disconnect();
    await db.destroy();
  }, logger);
}

main().catch((error) => {
  console.error('Failed to start profile-worker:', error);
  process.exit(1);
});
