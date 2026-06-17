import { createHash } from 'node:crypto';
import type { RetrievalResult } from '@smriti/shared-types';
import type { RedisClient } from './connection';

const DEFAULT_TTL_SECONDS = 60;

/**
 * Short-lived cache of retrieval results keyed by user + query hash. Kept brief
 * because new memories change relevant context quickly.
 */
export class ContextCache {
  constructor(
    private readonly redis: RedisClient,
    private readonly ttlSeconds = DEFAULT_TTL_SECONDS,
  ) {}

  private key(userId: string, query: string): string {
    const hash = createHash('sha256').update(query).digest('hex').slice(0, 16);
    return `context:${userId}:${hash}`;
  }

  async get(userId: string, query: string): Promise<RetrievalResult | null> {
    const raw = await this.redis.get(this.key(userId, query));
    return raw ? (JSON.parse(raw) as RetrievalResult) : null;
  }

  async set(userId: string, query: string, result: RetrievalResult): Promise<void> {
    await this.redis.set(this.key(userId, query), JSON.stringify(result), 'EX', this.ttlSeconds);
  }

  /** Best-effort purge of all cached contexts for a user (e.g. on new memory). */
  async invalidateUser(userId: string): Promise<void> {
    const pattern = `context:${userId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
