import type { ColumnType, Generated } from 'kysely';

/**
 * timestamptz column: selected as Date, optional on insert (DB default), and
 * accepts Date|string on write. Defined directly (not wrapped in Generated) to
 * avoid nesting ColumnType, which breaks Kysely's select-type inference.
 */
type TimestampCol = ColumnType<Date, Date | string | undefined, Date | string>;
type NullableTimestampCol = ColumnType<
  Date | null,
  Date | string | null | undefined,
  Date | string | null
>;

export interface UsersTable {
  id: string;
  name: string | null;
  created_at: TimestampCol;
}

export interface MemoriesTable {
  id: string;
  user_id: string;
  type: 'working' | 'episodic' | 'semantic';
  content: string;
  importance: Generated<number>;
  status: Generated<'pending' | 'active' | 'archived' | 'deleted'>;
  metadata: Generated<Record<string, unknown>>;
  created_at: TimestampCol;
  updated_at: TimestampCol;
  deleted_at: NullableTimestampCol;
}

export interface MemoryEmbeddingsTable {
  memory_id: string;
  provider: string;
  model: string;
  dimensions: number;
  /** pgvector column, serialized as a bracketed string literal. */
  embedding: string;
  content_hash: string;
  created_at: TimestampCol;
}

export interface MemorySummariesTable {
  id: string;
  user_id: string;
  summary: string;
  summary_type: Generated<string>;
  created_at: TimestampCol;
}

export interface UserProfilesTable {
  user_id: string;
  profile: Generated<Record<string, unknown>>;
  updated_at: TimestampCol;
}

export interface ProcessedEventsTable {
  event_id: string;
  consumer_group: string;
  processed_at: TimestampCol;
}

export interface SchemaMigrationsTable {
  name: string;
  applied_at: TimestampCol;
}

/** The full database shape consumed by Kysely. */
export interface Database {
  users: UsersTable;
  memories: MemoriesTable;
  memory_embeddings: MemoryEmbeddingsTable;
  memory_summaries: MemorySummariesTable;
  user_profiles: UserProfilesTable;
  processed_events: ProcessedEventsTable;
  schema_migrations: SchemaMigrationsTable;
}
