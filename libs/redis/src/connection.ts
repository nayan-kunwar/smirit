import { Redis } from 'ioredis';

export type RedisClient = Redis;

export function createRedis(url: string): Redis {
  return new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });
}
