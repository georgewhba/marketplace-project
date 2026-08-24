import { config } from 'dotenv';
config();

import { sendSms } from '../server/services/sms.service.js';

async function testSms() {
  const args = process.argv.slice(2);
  const to = args[0];

  if (!to) {
    console.error('Usage: npm run tsx scripts/test-sms.ts <phone_number>');
    process.exit(1);
  }

  console.log(`Sending test SMS to ${to}...`);
  
  await sendSms({
    to,
    message: 'Test SMS from Marketplace E-Commerce Platform',
  });

  console.log('Test complete. Check the database or your phone.');
  process.exit(0);
}

testSms();
