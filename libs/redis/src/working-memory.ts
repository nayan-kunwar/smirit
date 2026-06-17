import type { WorkingMemoryTurn } from '@smriti/shared-types';
import type { RedisClient } from './connection';

const DEFAULT_TTL_SECONDS = 24 * 60 * 60; // 24h

/**
 * Session-scoped working memory backed by a Redis list with a TTL. Holds the
 * current conversation; expires automatically.
 */
export class WorkingMemoryStore {
  constructor(
    private readonly redis: RedisClient,
    private readonly ttlSeconds = DEFAULT_TTL_SECONDS,
  ) {}

  private key(sessionId: string): string {
    return `session:${sessionId}`;
  }

  async append(turn: WorkingMemoryTurn): Promise<void> {
    const key = this.key(turn.sessionId);
    await this.redis
      .multi()
      .rpush(key, JSON.stringify({ role: turn.role, content: turn.content }))
      .expire(key, this.ttlSeconds)
      .exec();
  }

  async list(sessionId: string): Promise<Array<{ role: string; content: string }>> {
    const items = await this.redis.lrange(this.key(sessionId), 0, -1);
    return items.map((item) => JSON.parse(item) as { role: string; content: string });
  }

  async clear(sessionId: string): Promise<void> {
    await this.redis.del(this.key(sessionId));
  }
}
