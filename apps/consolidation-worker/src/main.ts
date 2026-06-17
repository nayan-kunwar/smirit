import { loadConfig } from '@smriti/config';
import {
  scheduleConsolidateSchema,
  TOPICS,
  type EventEnvelope,
  type ScheduleUserPayload,
} from '@smriti/events';
import { ConsumerRuntime, createKafka, KafkaProducer } from '@smriti/kafka';
import { findConsolidationGroups } from '@smriti/memory-core';
import { createLogger, getMetrics, registerShutdown } from '@smriti/observability';
import {
  createDb,
  PostgresMemoryRepository,
  PostgresProcessedEventsRepository,
} from '@smriti/postgres';

type ScheduleConsolidateEvent = EventEnvelope<'schedule-consolidate', ScheduleUserPayload>;

const GROUP = 'consolidation-worker';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ service: `${config.otel.serviceName}-consolidation-worker` });
  const metrics = getMetrics();

  const { db } = createDb({ url: config.postgres.url, poolSize: config.postgres.poolSize });
  const memories = new PostgresMemoryRepository(db);
  const processed = new PostgresProcessedEventsRepository(db);

  const kafka = createKafka({ brokers: config.kafka.brokers, clientId: config.kafka.clientId });
  const producer = new KafkaProducer(kafka);

  const runtime = new ConsumerRuntime<ScheduleConsolidateEvent>({
    kafka,
    producer,
    topic: TOPICS.scheduleConsolidate,
    groupId: GROUP,
    idempotency: processed,
    logger,
    metrics,
    validate: (value) => scheduleConsolidateSchema.parse(value) as ScheduleConsolidateEvent,
    handler: async (event) => {
      const { userId } = event.payload;
      const all = await memories.listByUser(userId, { limit: 500, offset: 0 });
      const semantic = all.filter((memory) => memory.type === 'semantic');

      const groups = findConsolidationGroups(
        semantic.map((memory) => ({
          id: memory.id,
          content: memory.content,
          importance: memory.importance,
        })),
      );

      for (const group of groups) {
        for (const mergedId of group.mergedIds) {
          await memories.setStatus(mergedId, 'archived');
        }
        await producer.publish({
          eventName: TOPICS.memoryConsolidated,
          partitionKey: userId,
          payload: {
            userId,
            survivingMemoryId: group.survivingId,
            mergedMemoryIds: group.mergedIds,
          },
          traceparent: event.traceparent,
        });
      }

      logger.info({ userId, groups: groups.length }, 'consolidation complete');
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
  console.error('Failed to start consolidation-worker:', error);
  process.exit(1);
});
