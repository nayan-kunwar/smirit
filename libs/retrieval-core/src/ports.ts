import type { RetrievalResult } from '@smriti/shared-types';

/** Embeds the query text. Adapter wraps the configured EmbeddingProvider. */
export interface QueryEmbedder {
  embed(text: string): Promise<number[]>;
}

export interface VectorCandidate {
  memoryId: string;
  content: string;
  importance: number;
  createdAt: Date;
  similarity: number;
}

/** Vector similarity search port. Implemented by the postgres adapter. */
export interface VectorSearchPort {
  search(params: {
    userId: string;
    embedding: number[];
    limit: number;
  }): Promise<VectorCandidate[]>;
}

/** Short-lived retrieval result cache port. Implemented by the redis adapter. */
export interface RetrievalCachePort {
  get(userId: string, query: string): Promise<RetrievalResult | null>;
  set(userId: string, query: string, result: RetrievalResult): Promise<void>;
}

/** Injectable clock for deterministic recency math in tests. */
export interface Clock {
  now(): Date;
}
