import type { AnyEventEnvelope } from '@smriti/events';
import { v4 as uuid } from 'uuid';
import type { Kafka, Producer } from 'kafkajs';

export interface PublishInput {
  eventName: string;
  partitionKey: string;
  payload: Record<string, unknown>;
  version?: number;
  traceparent?: string;
}

/** Thin wrapper around a kafkajs producer that builds the standard envelope. */
export class KafkaProducer {
  private readonly producer: Producer;
  private connected = false;

  constructor(kafka: Kafka) {
    this.producer = kafka.producer({ allowAutoTopicCreation: true });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.producer.connect();
      this.connected = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.producer.disconnect();
      this.connected = false;
    }
  }

  async publish(input: PublishInput): Promise<void> {
    const envelope: AnyEventEnvelope = {
      eventId: uuid(),
      eventName: input.eventName,
      version: input.version ?? 1,
      occurredAt: new Date().toISOString(),
      partitionKey: input.partitionKey,
      traceparent: input.traceparent,
      payload: input.payload,
    };

    await this.publishEnvelope(input.eventName, envelope);
  }

  /** Publish a pre-built envelope (used for retry/DLQ forwarding). */
  async publishEnvelope(topic: string, envelope: AnyEventEnvelope): Promise<void> {
    await this.connect();
    await this.producer.send({
      topic,
      messages: [
        {
          key: envelope.partitionKey,
          value: JSON.stringify(envelope),
          headers: envelope.traceparent ? { traceparent: envelope.traceparent } : undefined,
        },
      ],
    });
  }
}
