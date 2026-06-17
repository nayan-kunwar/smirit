import type { ListOptions } from '@smriti/shared-types';
import type { Memory, NewMemory } from './domain';

/**
 * Repository port for memory persistence. Implemented by the postgres adapter.
 * The domain owns this interface; infrastructure depends on the domain.
 */
export interface MemoryRepository {
  insert(memory: NewMemory): Promise<Memory>;
  findById(id: string): Promise<Memory | null>;
  listByUser(userId: string, options: ListOptions): Promise<Memory[]>;
  softDelete(id: string): Promise<void>;
  setImportance(id: string, importance: number): Promise<void>;
  setStatus(id: string, status: Memory['status']): Promise<void>;
}

/** Outbound port for publishing domain events. */
export interface EventPublisher {
  publish(event: {
    eventName: string;
    partitionKey: string;
    payload: Record<string, unknown>;
    traceparent?: string;
  }): Promise<void>;
}

/** Injectable clock so use cases stay deterministic and testable. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

/** Injectable id generator. */
export interface IdGenerator {
  next(): string;
}
