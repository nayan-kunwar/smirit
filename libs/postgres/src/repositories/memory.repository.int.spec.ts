import { randomUUID as uuid } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Db } from '../connection';
import { runMigrations } from '../migrator';
import { PostgresMemoryRepository } from './memory.repository';

/**
 * Integration test against a real Postgres (pgvector) instance. Skipped unless
 * SMRITI_INTEGRATION=1 and POSTGRES_URL are set, so unit CI stays infra-free.
 * Run locally with: `pnpm infra:up` then
 * `SMRITI_INTEGRATION=1 POSTGRES_URL=... pnpm -C libs/postgres test`.
 */
const enabled = process.env.SMRITI_INTEGRATION === '1' && Boolean(process.env.POSTGRES_URL);

describe.skipIf(!enabled)('PostgresMemoryRepository (integration)', () => {
  let db: Db;
  let pool: { end: () => Promise<void> };
  const userId = uuid();

  beforeAll(async () => {
    const conn = createDb({ url: process.env.POSTGRES_URL as string });
    db = conn.db;
    pool = conn.pool;
    await runMigrations(db);
    await db.insertInto('users').values({ id: userId, name: 'Integration User' }).execute();
  });

  afterAll(async () => {
    if (db) {
      await db.deleteFrom('memories').where('user_id', '=', userId).execute();
      await db.deleteFrom('users').where('id', '=', userId).execute();
      await db.destroy();
      await pool.end();
    }
  });

  it('inserts, reads, and soft-deletes a memory', async () => {
    const repo = new PostgresMemoryRepository(db);
    const created = await repo.insert({
      id: uuid(),
      userId,
      type: 'semantic',
      content: 'I am a backend engineer',
      status: 'pending',
      metadata: {},
      createdAt: new Date(),
    });

    const found = await repo.findById(created.id);
    expect(found?.content).toBe('I am a backend engineer');

    await repo.setImportance(created.id, 9);
    await repo.softDelete(created.id);

    const list = await repo.listByUser(userId, { limit: 10, offset: 0 });
    expect(list.find((m) => m.id === created.id)).toBeUndefined();
  });
});
