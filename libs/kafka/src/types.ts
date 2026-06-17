import type { AnyEventEnvelope } from '@smriti/events';

/**
 * Idempotency port. Implemented by an adapter (e.g. the postgres
 * processed-events repository). The kafka library does not depend on a specific
 * store so it stays infrastructure-agnostic.
 */
export interface IdempotencyStore {
  /** Returns true if the caller should process (first time seen). */
  claim(eventId: string, consumerGroup: string): Promise<boolean>;
}

export interface MessageHandler<TEnvelope extends AnyEventEnvelope = AnyEventEnvelope> {
  (envelope: TEnvelope): Promise<void>;
}

export type EnvelopeValidator<TEnvelope extends AnyEventEnvelope> = (value: unknown) => TEnvelope;
