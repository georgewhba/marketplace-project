import { Queue, Worker, type Job } from 'bullmq';
import { redis, isRedisMock } from '../lib/redis.js';
import { sendEmail, type EmailOptions } from '../services/email.service.js';

const QUEUE_NAME = 'email-queue';

// 1. Create the Queue
export const emailQueue = isRedisMock
  ? ({
      add: async (_name: string, data: EmailOptions) => {
        sendEmail(data).catch(console.error);
        return {} as any;
      },
      close: async () => {},
    } as unknown as Queue<EmailOptions>)
  : new Queue<EmailOptions>(QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    });

// 2. Create the Worker (uses a dedicated duplicate connection as required by BullMQ)
const workerConnection = isRedisMock
  ? null
  : redis.duplicate({ maxRetriesPerRequest: null });

export const emailWorker = isRedisMock
  ? ({ on: () => {}, close: async () => {} } as unknown as Worker<EmailOptions>)
  : new Worker<EmailOptions>(
      QUEUE_NAME,
      async (job: Job<EmailOptions>) => {
        await sendEmail(job.data);
      },
      {
        connection: workerConnection,
        concurrency: 5,
      }
    );

if (!isRedisMock) {
  emailWorker.on('completed', (job) => {
    console.log(`[Email Queue] Job ${job.id} completed successfully.`);
  });

  emailWorker.on('failed', (job, err) => {
    console.error(`[Email Queue] Job ${job?.id} failed:`, err.message);
  });
}
