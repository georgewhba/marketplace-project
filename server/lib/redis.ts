import Redis from 'ioredis';
import { env } from '../env.js';
import { createRequire } from 'module';

/**
 * Global Redis client instance.
 * Re-uses connection across the app.
 */
const redisConfig = {
  host: env.REDIS_HOST || 'localhost',
  port: env.REDIS_PORT ? parseInt(String(env.REDIS_PORT), 10) : 6379,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

// Use mock in test environment to avoid requiring a real Redis server
let RedisClient = Redis as any;
if (env.NODE_ENV === 'test') {
  try {
    const require = createRequire(import.meta.url);
    const RedisMock = require('ioredis-mock');
    RedisClient = RedisMock;
  } catch (e) {
    console.warn('ioredis-mock not found, using real Redis');
  }
}

export const redis = new RedisClient(redisConfig);

redis.on('error', (err: any) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.info('Redis connected successfully.');
});
