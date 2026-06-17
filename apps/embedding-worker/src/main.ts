import { createHash } from 'node:crypto';
import { loadConfig } from '@smriti/config';
import { createEmbeddingProvider } from '@smriti/embedding';
import { memoryCreatedSchema, TOPICS, type MemoryCreatedEvent } from '@smriti/events';
import { ConsumerRuntime, createKafka, KafkaProducer } from '@smriti/kafka';
import { createLogger, getMetrics, registerShutdown } from '@smriti/observability';
import {
  createDb,
  PostgresEmbeddingRepository,
  PostgresMemoryRepository,
  PostgresProcessedEventsRepository,
} from '@smriti/postgres';

const GROUP = 'embedding-worker';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ service: `${config.otel.serviceName}-embedding-worker` });
  const metrics = getMetrics();

  const { db } = createDb({ url: config.postgres.url, poolSize: config.postgres.poolSize });
  const embeddings = new PostgresEmbeddingRepository(db);
  const memories = new PostgresMemoryRepository(db);
  const processed = new PostgresProcessedEventsRepository(db);
  const provider = createEmbeddingProvider(config.embedding);

  const kafka = createKafka({ brokers: config.kafka.brokers, clientId: config.kafka.clientId });
  const producer = new KafkaProducer(kafka);

  const runtime = new ConsumerRuntime<MemoryCreatedEvent>({
    kafka,
    producer,
    topic: TOPICS.memoryCreated,
    groupId: GROUP,
    idempotency: processed,
    logger,
    metrics,
    validate: (value) => memoryCreatedSchema.parse(value) as MemoryCreatedEvent,
    handler: async (event) => {
      const { memoryId, userId, content } = event.payload;
      const contentHash = createHash('sha256').update(content).digest('hex');

      if (await embeddings.existsForHash(memoryId, contentHash)) {
        logger.debug({ memoryId }, 'embedding already current, skipping');
        return;
      }

      const stop = metrics.embeddingDuration.startTimer({
        provider: provider.name,
        model: provider.model,
      });
      const vector = await provider.embed(content);
      stop();

      await embeddings.upsert({
        memoryId,
        provider: provider.name,
        model: provider.model,
        dimensions: provider.dimensions,
        embedding: vector,
        contentHash,
      });

      // A memory becomes retrievable once it has an embedding.
      await memories.setStatus(memoryId, 'active');

      await producer.publish({
        eventName: TOPICS.embeddingGenerated,
        partitionKey: userId,
        payload: {
          memoryId,
          userId,
          provider: provider.name,
          model: provider.model,
          dimensions: provider.dimensions,
        },
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
  console.error('Failed to start embedding-worker:', error);
  process.exit(1);
});
