import { Queue } from 'bullmq';
import RedisMock from 'ioredis-mock';

async function run() {
  console.log('Testing BullMQ with ioredis-mock...');
  const mockClient = new RedisMock();
  try {
    const q = new Queue('test', { connection: mockClient as any });
    await q.add('job', { foo: 'bar' });
    console.log('Success! BullMQ accepted ioredis-mock.');
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
}

run();
