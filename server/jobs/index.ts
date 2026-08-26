import { emailQueue, emailWorker } from './email.queue.js';
// Add more queues here in the future

export const queues = [emailQueue];
export const workers = [emailWorker];

export async function closeQueues() {
  console.log('Shutting down BullMQ queues and workers...');
  
  // Close workers first so they stop accepting new jobs
  await Promise.allSettled(workers.map(w => w.close()));
  
  // Close queues
  await Promise.allSettled(queues.map(q => q.close()));
  
  console.log('BullMQ shutdown complete.');
}
