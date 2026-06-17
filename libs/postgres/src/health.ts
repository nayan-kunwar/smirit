import { sql } from 'kysely';
import type { Db } from './connection';

/** Lightweight connectivity check for readiness probes. */
export async function pingDb(db: Db): Promise<void> {
  await sql`SELECT 1`.execute(db);
}
