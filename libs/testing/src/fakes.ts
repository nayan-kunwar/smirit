/** Deterministic clock for tests. */
export function fixedClock(iso = '2026-01-01T00:00:00.000Z'): { now: () => Date } {
  return { now: () => new Date(iso) };
}

/** Sequential id generator for tests. */
export function sequentialIds(prefix = '00000000-0000-0000-0000-0000000000'): {
  next: () => string;
} {
  let counter = 0;
  return {
    next: () => `${prefix}${(++counter).toString().padStart(2, '0')}`,
  };
}

/** Collects published events for assertions. */
export class FakeEventPublisher {
  readonly events: Array<{
    eventName: string;
    partitionKey: string;
    payload: Record<string, unknown>;
    traceparent?: string;
  }> = [];

  async publish(event: {
    eventName: string;
    partitionKey: string;
    payload: Record<string, unknown>;
    traceparent?: string;
  }): Promise<void> {
    this.events.push(event);
  }
}
