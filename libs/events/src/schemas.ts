import { z } from 'zod';

/** Factory building an envelope schema for a given event name + payload schema. */
function envelopeSchema<TName extends string, TPayload extends z.ZodTypeAny>(
  eventName: TName,
  payload: TPayload,
) {
  return z.object({
    eventId: z.string().uuid(),
    eventName: z.literal(eventName),
    version: z.number().int().positive(),
    occurredAt: z.string().datetime(),
    partitionKey: z.string().min(1),
    traceparent: z.string().optional(),
    attempt: z.number().int().nonnegative().optional(),
    payload,
  });
}

export const memoryEventType = z.enum(['working', 'episodic', 'semantic']);

export const memoryCreatedSchema = envelopeSchema(
  'memory-created',
  z.object({
    memoryId: z.string().uuid(),
    userId: z.string().uuid(),
    type: memoryEventType,
    content: z.string().min(1),
  }),
);

export const memoryUpdatedSchema = envelopeSchema(
  'memory-updated',
  z.object({
    memoryId: z.string().uuid(),
    userId: z.string().uuid(),
    content: z.string().min(1),
  }),
);

export const memoryDeletedSchema = envelopeSchema(
  'memory-deleted',
  z.object({
    memoryId: z.string().uuid(),
    userId: z.string().uuid(),
  }),
);

export const embeddingGeneratedSchema = envelopeSchema(
  'embedding-generated',
  z.object({
    memoryId: z.string().uuid(),
    userId: z.string().uuid(),
    provider: z.string(),
    model: z.string(),
    dimensions: z.number().int().positive(),
  }),
);

export const memoryScoredSchema = envelopeSchema(
  'memory-scored',
  z.object({
    memoryId: z.string().uuid(),
    userId: z.string().uuid(),
    importance: z.number().int().min(0).max(10),
  }),
);

export const summaryGeneratedSchema = envelopeSchema(
  'summary-generated',
  z.object({
    userId: z.string().uuid(),
    summaryId: z.string().uuid(),
    summaryType: z.string(),
  }),
);

export const profileGeneratedSchema = envelopeSchema(
  'profile-generated',
  z.object({
    userId: z.string().uuid(),
  }),
);

export const memoryConsolidatedSchema = envelopeSchema(
  'memory-consolidated',
  z.object({
    userId: z.string().uuid(),
    survivingMemoryId: z.string().uuid(),
    mergedMemoryIds: z.array(z.string().uuid()),
  }),
);

const scheduleUserSchemaShape = z.object({ userId: z.string().uuid() });

export const scheduleSummarizeSchema = envelopeSchema(
  'schedule-summarize',
  scheduleUserSchemaShape,
);
export const scheduleConsolidateSchema = envelopeSchema(
  'schedule-consolidate',
  scheduleUserSchemaShape,
);
export const scheduleProfileSchema = envelopeSchema('schedule-profile', scheduleUserSchemaShape);

export const eventSchemasByName = {
  'memory-created': memoryCreatedSchema,
  'memory-updated': memoryUpdatedSchema,
  'memory-deleted': memoryDeletedSchema,
  'embedding-generated': embeddingGeneratedSchema,
  'memory-scored': memoryScoredSchema,
  'summary-generated': summaryGeneratedSchema,
  'profile-generated': profileGeneratedSchema,
  'memory-consolidated': memoryConsolidatedSchema,
  'schedule-summarize': scheduleSummarizeSchema,
  'schedule-consolidate': scheduleConsolidateSchema,
  'schedule-profile': scheduleProfileSchema,
} as const;

export type EventName = keyof typeof eventSchemasByName;
