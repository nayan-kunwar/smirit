import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { Database } from './schema';

export type Db = Kysely<Database>;

export interface PostgresOptions {
  url: string;
  poolSize?: number;
}

/** Create a Kysely instance backed by a pg connection pool. */
export function createDb(options: PostgresOptions): { db: Db; pool: pg.Pool } {
  const pool = new pg.Pool({
    connectionString: options.url,
    max: options.poolSize ?? 10,
  });

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });

  return { db, pool };
}

/** Format a numeric vector into the pgvector text literal: "[1,2,3]". */
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`;
}
