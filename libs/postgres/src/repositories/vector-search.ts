import { sql } from 'kysely';
import type { Db } from '../connection';
import { toVectorLiteral } from '../connection';

export interface VectorMatch {
  memoryId: string;
  content: string;
  importance: number;
  createdAt: Date;
  similarity: number;
}

export interface VectorSearchParams {
  userId: string;
  embedding: number[];
  limit: number;
}

/**
 * pgvector cosine similarity search scoped to a user's active, non-deleted
 * memories. Returns candidates ordered by similarity descending.
 */
export class PostgresVectorSearch {
  constructor(private readonly db: Db) {}

  async search(params: VectorSearchParams): Promise<VectorMatch[]> {
    const literal = toVectorLiteral(params.embedding);
    const query = sql<{
      memory_id: string;
      content: string;
      importance: number;
      created_at: Date;
      similarity: number;
    }>`
      SELECT m.id AS memory_id,
             m.content AS content,
             m.importance AS importance,
             m.created_at AS created_at,
             1 - (e.embedding <=> ${literal}::vector) AS similarity
      FROM memory_embeddings e
      JOIN memories m ON m.id = e.memory_id
      WHERE m.user_id = ${params.userId}
        AND m.deleted_at IS NULL
        AND m.status = 'active'
      ORDER BY e.embedding <=> ${literal}::vector
      LIMIT ${params.limit}
    `;

    const result = await query.execute(this.db);
    return result.rows.map((row) => ({
      memoryId: row.memory_id,
      content: row.content,
      importance: row.importance,
      createdAt: new Date(row.created_at),
      similarity: Number(row.similarity),
    }));
  }
}
