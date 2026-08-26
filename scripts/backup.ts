import { exec } from 'child_process';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';

const execAsync = promisify(exec);

// Configuration from Environment Variables
const DB_URL = process.env.DATABASE_URL;
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_REGION = process.env.S3_REGION || 'auto';
const S3_BUCKET = process.env.S3_BUCKET;
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;
const RETENTION_DAYS_DAILY = 30;
const RETENTION_DAYS_WEEKLY = 90;

async function runBackup() {
  if (!DB_URL || !S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY || !S3_SECRET_KEY) {
    console.error('Missing required environment variables for backup (DATABASE_URL, S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY)');
    process.exit(1);
  }

  const s3Client = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    credentials: {
      accessKeyId: S3_ACCESS_KEY,
      secretAccessKey: S3_SECRET_KEY,
    },
    // Force path style for Cloudflare R2 / Backblaze compatibility
    forcePathStyle: true,
  });

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-');
  const isWeekly = now.getDay() === 0; // Sunday
  const prefix = isWeekly ? 'weekly' : 'daily';
  
  const backupFileName = `backup-${prefix}-${timestamp}.sql.gz`;
  const backupPath = path.join(process.cwd(), backupFileName);

  console.log(`[Backup] Starting backup process for ${backupFileName}...`);

  try {
    // 1. Create Dump and Compress
    console.log('[Backup] Running pg_dump and gzip...');
    await execAsync(`pg_dump "${DB_URL}" | gzip > "${backupPath}"`);
    console.log('[Backup] Dump and compression complete.');

    // 2. Upload to S3
    console.log('[Backup] Uploading to external storage...');
    const fileStream = createReadStream(backupPath);
    await s3Client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: `${prefix}/${backupFileName}`,
      Body: fileStream,
    }));
    console.log('[Backup] Upload successful.');

    // 3. Cleanup Local File
    await fs.unlink(backupPath);
    console.log('[Backup] Cleaned up local backup file.');

    // 4. Enforce Retention Policy
    console.log('[Backup] Enforcing retention policy...');
    await enforceRetentionPolicy(s3Client, 'daily/', RETENTION_DAYS_DAILY);
    await enforceRetentionPolicy(s3Client, 'weekly/', RETENTION_DAYS_WEEKLY);

    console.log('[Backup] Backup process completed successfully ✅');
  } catch (error) {
    console.error('[Backup] Process failed!', error);
    try {
      await fs.unlink(backupPath).catch(() => {});
    } catch (e) {
      // Ignore cleanup error
    }
    process.exit(1);
  }
}

async function enforceRetentionPolicy(s3Client: S3Client, prefix: string, retentionDays: number) {
  const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
  const cutoffDate = new Date(Date.now() - retentionMs);

  const listResponse = await s3Client.send(new ListObjectsV2Command({
    Bucket: S3_BUCKET,
    Prefix: prefix,
  }));

  if (!listResponse.Contents || listResponse.Contents.length === 0) {
    return;
  }

  for (const item of listResponse.Contents) {
    if (item.LastModified && item.LastModified < cutoffDate) {
      console.log(`[Backup] Deleting old backup: ${item.Key} (Modified: ${item.LastModified})`);
      await s3Client.send(new DeleteObjectCommand({
        Bucket: S3_BUCKET,
        Key: item.Key,
      }));
    }
  }
}

runBackup();
