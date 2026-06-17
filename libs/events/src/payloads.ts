import type { EventEnvelope } from './envelope';

export type MemoryEventType = 'working' | 'episodic' | 'semantic';

export interface MemoryCreatedPayload {
  memoryId: string;
  userId: string;
  type: MemoryEventType;
  content: string;
}

export interface MemoryUpdatedPayload {
  memoryId: string;
  userId: string;
  content: string;
}

export interface MemoryDeletedPayload {
  memoryId: string;
  userId: string;
}

export interface EmbeddingGeneratedPayload {
  memoryId: string;
  userId: string;
  provider: string;
  model: string;
  dimensions: number;
}

export interface MemoryScoredPayload {
  memoryId: string;
  userId: string;
  importance: number;
}

export interface SummaryGeneratedPayload {
  userId: string;
  summaryId: string;
  summaryType: string;
}

export interface ProfileGeneratedPayload {
  userId: string;
}

export interface MemoryConsolidatedPayload {
  userId: string;
  survivingMemoryId: string;
  mergedMemoryIds: string[];
}

export interface ScheduleUserPayload {
  userId: string;
}

export type MemoryCreatedEvent = EventEnvelope<'memory-created', MemoryCreatedPayload>;
export type MemoryUpdatedEvent = EventEnvelope<'memory-updated', MemoryUpdatedPayload>;
export type MemoryDeletedEvent = EventEnvelope<'memory-deleted', MemoryDeletedPayload>;
export type EmbeddingGeneratedEvent = EventEnvelope<
  'embedding-generated',
  EmbeddingGeneratedPayload
>;
export type MemoryScoredEvent = EventEnvelope<'memory-scored', MemoryScoredPayload>;
export type SummaryGeneratedEvent = EventEnvelope<'summary-generated', SummaryGeneratedPayload>;
export type ProfileGeneratedEvent = EventEnvelope<'profile-generated', ProfileGeneratedPayload>;
export type MemoryConsolidatedEvent = EventEnvelope<
  'memory-consolidated',
  MemoryConsolidatedPayload
>;
