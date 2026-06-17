import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'kysely';
import type { Db } from './connection';

const here = dirname(fileURLToPath(import.meta.url));
export const MIGRATIONS_DIR = join(here, '..', 'migrations');

async function ensureMigrationsTable(db: Db): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `.execute(db);
}

async function appliedMigrations(db: Db): Promise<Set<string>> {
  const rows = await db.selectFrom('schema_migrations').select('name').execute();
  return new Set(rows.map((row) => row.name));
}

/**
 * Apply all pending forward-only SQL migrations in lexicographic order. Each
 * migration runs inside its own transaction and is recorded on success.
 */
export async function runMigrations(
  db: Db,
  options: { dir?: string; log?: (message: string) => void } = {},
): Promise<string[]> {
  const dir = options.dir ?? MIGRATIONS_DIR;
  const log = options.log ?? (() => undefined);

  await ensureMigrationsTable(db);
  const already = await appliedMigrations(db);

  const files = (await readdir(dir))
    .filter((file) => file.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));

  const applied: string[] = [];
  for (const file of files) {
    if (already.has(file)) continue;

    const ddl = await readFile(join(dir, file), 'utf8');
    await db.transaction().execute(async (trx) => {
      await sql.raw(ddl).execute(trx);
      await trx.insertInto('schema_migrations').values({ name: file }).execute();
    });

    applied.push(file);
    log(`applied migration: ${file}`);
  }

  if (applied.length === 0) {
    log('no pending migrations');
  }
  return applied;
}
