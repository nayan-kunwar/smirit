import { loadConfig } from '@smriti/config';
import { createDb } from '../connection';
import { runMigrations } from '../migrator';

/** CLI entrypoint: `pnpm nx run @smriti/postgres:migrate`. */
async function main(): Promise<void> {
  const config = loadConfig();
  const { db } = createDb({
    url: config.postgres.url,
    poolSize: config.postgres.poolSize,
  });

  try {
    const applied = await runMigrations(db, { log: (m) => console.log(`[migrate] ${m}`) });
    console.log(`[migrate] done (${applied.length} applied)`);
  } finally {
    await db.destroy();
  }
}

main().catch((error) => {
  console.error('[migrate] failed:', error);
  process.exit(1);
});
