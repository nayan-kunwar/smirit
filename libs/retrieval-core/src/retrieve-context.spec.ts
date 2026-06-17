import { describe, expect, it } from 'vitest';
import type { QueryEmbedder, RetrievalCachePort, VectorCandidate, VectorSearchPort } from './ports';
import { RetrieveContextUseCase } from './retrieve-context';

const embedder: QueryEmbedder = { embed: async () => [1, 0, 0] };

function searchReturning(candidates: VectorCandidate[]): VectorSearchPort {
  return { search: async () => candidates };
}

const now = new Date('2026-01-31T00:00:00.000Z');

describe('RetrieveContextUseCase', () => {
  it('ranks, dedupes, and returns top-N context', async () => {
    const candidates: VectorCandidate[] = [
      {
        memoryId: 'a',
        content: 'Learning Kafka',
        importance: 8,
        similarity: 0.9,
        createdAt: new Date('2026-01-30T00:00:00.000Z'),
      },
      {
        memoryId: 'b',
        content: 'Old note',
        importance: 1,
        similarity: 0.2,
        createdAt: new Date('2020-01-01T00:00:00.000Z'),
      },
    ];
    const useCase = new RetrieveContextUseCase(
      { embedder, vectorSearch: searchReturning(candidates), clock: { now: () => now } },
      { topN: 1 },
    );

    const { result, cacheHit } = await useCase.execute({ userId: 'u', query: 'kafka' });
    expect(cacheHit).toBe(false);
    expect(result.context).toEqual(['Learning Kafka']);
    expect(result.items[0].memoryId).toBe('a');
  });

  it('returns cached result without searching', async () => {
    const cache: RetrievalCachePort = {
      get: async () => ({ context: ['cached'], items: [] }),
      set: async () => undefined,
    };
    const useCase = new RetrieveContextUseCase({
      embedder,
      vectorSearch: {
        search: async () => {
          throw new Error('should not be called on cache hit');
        },
      },
      cache,
    });

    const { result, cacheHit } = await useCase.execute({ userId: 'u', query: 'kafka' });
    expect(cacheHit).toBe(true);
    expect(result.context).toEqual(['cached']);
  });
});
