import type { Db } from '../connection';

/**
 * Event-level idempotency store. A consumer records each processed event id
 * (scoped by consumer group); duplicates are skipped on redelivery.
 */
export class PostgresProcessedEventsRepository {
  constructor(private readonly db: Db) {}

  /**
   * Atomically claim an event id. Returns true if this is the first time the
   * event is seen by the group (caller should process), false if it was already
   * processed (caller should skip).
   */
  async claim(eventId: string, consumerGroup: string): Promise<boolean> {
    const result = await this.db
      .insertInto('processed_events')
      .values({ event_id: eventId, consumer_group: consumerGroup })
      .onConflict((oc) => oc.columns(['event_id', 'consumer_group']).doNothing())
      .executeTakeFirst();

    return (result.numInsertedOrUpdatedRows ?? 0n) > 0n;
  }
}
