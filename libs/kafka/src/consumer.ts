import type { AnyEventEnvelope } from '@smriti/events';
import { dlqTopic, retryTopic } from '@smriti/events';
import type { Logger, Metrics } from '@smriti/observability';
import type { Consumer, Kafka } from 'kafkajs';
import type { KafkaProducer } from './producer';
import type { EnvelopeValidator, IdempotencyStore, MessageHandler } from './types';

export interface ConsumerRuntimeOptions<TEnvelope extends AnyEventEnvelope> {
  kafka: Kafka;
  producer: KafkaProducer;
  topic: string;
  groupId: string;
  validate: EnvelopeValidator<TEnvelope>;
  handler: MessageHandler<TEnvelope>;
  idempotency?: IdempotencyStore;
  logger: Logger;
  metrics: Metrics;
  maxAttempts?: number;
}

/**
 * A reusable, idempotent consumer runtime implementing the lifecycle from
 * docs/architecture/event-driven-design.md:
 * validate -> idempotency check -> handle -> commit, with bounded retries and a
 * dead-letter queue for poison or exhausted messages.
 */
export class ConsumerRuntime<TEnvelope extends AnyEventEnvelope> {
  private readonly consumer: Consumer;
  private readonly maxAttempts: number;

  constructor(private readonly options: ConsumerRuntimeOptions<TEnvelope>) {
    this.consumer = options.kafka.consumer({ groupId: options.groupId });
    this.maxAttempts = options.maxAttempts ?? 5;
  }

  async start(): Promise<void> {
    const { topic, logger } = this.options;
    await this.consumer.connect();
    await this.options.producer.connect();
    // Subscribe to the main topic and its retry topic.
    await this.consumer.subscribe({ topic, fromBeginning: false });
    await this.consumer.subscribe({ topic: retryTopic(topic), fromBeginning: false });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const raw = message.value?.toString();
        if (!raw) return;
        await this.process(raw);
      },
    });

    logger.info({ topic, groupId: this.options.groupId }, 'consumer started');
  }

  async stop(): Promise<void> {
    await this.consumer.disconnect();
  }

  private async process(raw: string): Promise<void> {
    const { topic, groupId, logger, metrics } = this.options;

    let envelope: TEnvelope;
    try {
      envelope = this.options.validate(JSON.parse(raw));
    } catch (error) {
      logger.error({ topic, err: String(error) }, 'invalid event payload, routing to DLQ');
      metrics.eventsDlq.inc({ topic });
      await this.toDlq(raw);
      return;
    }

    const log = logger.child({ topic, eventId: envelope.eventId });

    if (this.options.idempotency) {
      const fresh = await this.options.idempotency.claim(envelope.eventId, groupId);
      if (!fresh) {
        log.debug('duplicate event, skipping');
        metrics.eventsProcessed.inc({ topic, status: 'duplicate' });
        return;
      }
    }

    try {
      await this.options.handler(envelope);
      metrics.eventsProcessed.inc({ topic, status: 'success' });
    } catch (error) {
      metrics.eventsProcessed.inc({ topic, status: 'error' });
      await this.handleFailure(envelope, error, log);
    }
  }

  private async handleFailure(envelope: TEnvelope, error: unknown, log: Logger): Promise<void> {
    const attempt = (envelope.attempt ?? 0) + 1;
    const { topic, metrics } = this.options;

    if (attempt >= this.maxAttempts) {
      log.error({ attempt, err: String(error) }, 'max attempts reached, routing to DLQ');
      metrics.eventsDlq.inc({ topic });
      await this.options.producer.publishEnvelope(dlqTopic(topic), { ...envelope, attempt });
      return;
    }

    log.warn({ attempt, err: String(error) }, 'transient failure, scheduling retry');
    await this.options.producer.publishEnvelope(retryTopic(topic), { ...envelope, attempt });
  }

  private async toDlq(raw: string): Promise<void> {
    const envelope: AnyEventEnvelope = {
      eventId: 'unparseable',
      eventName: 'unparseable',
      version: 0,
      occurredAt: new Date().toISOString(),
      partitionKey: 'unparseable',
      payload: { raw },
    };
    await this.options.producer.publishEnvelope(dlqTopic(this.options.topic), envelope);
  }
}
