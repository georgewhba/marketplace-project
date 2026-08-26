import { Queue, Worker, type Job } from 'bullmq';
import { redis } from '../lib/redis.js';
import { sendEmail, type EmailOptions } from '../services/email.service.js';

const QUEUE_NAME = 'email-queue';

// 1. Create the Queue
export const emailQueue = new Queue<EmailOptions>(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2s, 4s, 8s
    },
    removeOnComplete: true, // Keep Redis clean
    removeOnFail: 100, // Keep last 100 failed jobs for debugging
  },
});

// 2. Create the Worker
export const emailWorker = new Worker<EmailOptions>(
  QUEUE_NAME,
  async (job: Job<EmailOptions>) => {
    // Process the email job
    await sendEmail(job.data);
  },
  {
    connection: redis,
    concurrency: 5, // Process up to 5 emails concurrently
  }
);

emailWorker.on('completed', (job) => {
  console.log(`[Email Queue] Job ${job.id} completed successfully.`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[Email Queue] Job ${job?.id} failed:`, err.message);
});
