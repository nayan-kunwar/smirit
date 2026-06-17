/**
 * The versioned envelope wrapping every domain event published to Kafka.
 * Producers and consumers compile against this single definition.
 */
export interface EventEnvelope<TName extends string, TPayload> {
  /** Unique id, used as the idempotency key by consumers. */
  eventId: string;
  /** Logical event name (also the Kafka topic). */
  eventName: TName;
  /** Schema version for this event name. */
  version: number;
  /** ISO-8601 timestamp of when the event occurred. */
  occurredAt: string;
  /** Used as the Kafka partition key to preserve per-user ordering. */
  partitionKey: string;
  /** Distributed-trace context for correlation across services. */
  traceparent?: string;
  /** Delivery metadata managed by the messaging layer. */
  attempt?: number;
  payload: TPayload;
}

export type AnyEventEnvelope = EventEnvelope<string, unknown>;
