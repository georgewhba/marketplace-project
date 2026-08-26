import Redis from 'ioredis';
import { env } from '../env.js';
import { createRequire } from 'module';

/**
 * Global Redis client instance.
 * Re-uses connection across the app.
 */
const redisConfig = {
  host: env.REDIS_HOST || env.REDISHOST || 'localhost',
  port: env.REDIS_PORT ? parseInt(String(env.REDIS_PORT), 10) : (env.REDISPORT ? parseInt(String(env.REDISPORT), 10) : 6379),
  password: env.REDIS_PASSWORD || env.REDISPASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Use mock in test environment to avoid requiring a real Redis server
let RedisClient = Redis as any;
// Check if real Redis credentials exist
const hasRedisCredentials = !!(env.REDIS_URL || env.REDIS_HOST || env.REDISHOST);

if (env.NODE_ENV === 'test' || !hasRedisCredentials) {
  try {
    const require = createRequire(import.meta.url);
    const RedisMock = require('ioredis-mock');
    RedisClient = RedisMock;
    if (!hasRedisCredentials && env.NODE_ENV !== 'test') {
      console.warn('⚠️ No Redis configuration found. Using in-memory ioredis-mock as fallback. This is fine for single-instance, but add a Redis service in Railway for persistent queues.');
    }
  } catch (e) {
    console.warn('ioredis-mock not found, using real Redis');
  }
}

export const isRedisMock = !hasRedisCredentials && env.NODE_ENV !== 'test';
export const redis = env.REDIS_URL ? new RedisClient(env.REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false }) : new RedisClient(redisConfig);

redis.on('error', (err: any) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.info('Redis connected successfully.');
});
