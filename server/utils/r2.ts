import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import https from 'node:https';
import crypto from 'node:crypto';
import { env } from '../env.js';

let s3Client: S3Client | null = null;

const accountId = env.R2_ACCOUNT_ID?.trim();
const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();

if (accountId && accessKeyId && secretAccessKey) {
  // Use a custom HTTPS agent to allow legacy server connections.
  // This resolves the EPROTO / SSL alert number 40 issue some Node 18/20 environments
  // experience during the TLS handshake with Cloudflare R2 on Railway.
  const agent = new https.Agent({
    secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
  });

  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
    requestHandler: new NodeHttpHandler({
      httpsAgent: agent,
    }),
    // Disable automatic checksums as they can cause AccessDenied in Cloudflare R2 with newer AWS SDKs
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}

/**
 * Uploads a buffer to Cloudflare R2 and returns the public URL.
 * Throws an error if R2 is not configured.
 */
export async function uploadToR2(buffer: Buffer, filename: string, contentType: string): Promise<string> {
  if (!s3Client || !env.R2_BUCKET_NAME || !env.R2_PUBLIC_URL) {
    throw new Error('R2 is not fully configured. Please set all R2 environment variables.');
  }

  // Ensure public URL has no trailing slash
  const publicUrlBase = env.R2_PUBLIC_URL.endsWith('/') 
    ? env.R2_PUBLIC_URL.slice(0, -1) 
    : env.R2_PUBLIC_URL;

  const key = `uploads/${filename}`;

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME.trim(),
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  return `${publicUrlBase}/${key}`;
}

/**
 * Deletes a file from Cloudflare R2.
 */
export async function deleteFromR2(fileUrl: string): Promise<void> {
  if (!s3Client || !env.R2_BUCKET_NAME || !env.R2_PUBLIC_URL) {
    // If not configured, we can't delete. Ignore or log warning.
    console.warn('Skipping R2 deletion because R2 is not configured.');
    return;
  }

  // Example url: https://cdn.domain.com/uploads/123-abc.webp
  // We need to extract the "Key" which is "uploads/123-abc.webp"
  const publicUrlBase = env.R2_PUBLIC_URL.endsWith('/') 
    ? env.R2_PUBLIC_URL.slice(0, -1) 
    : env.R2_PUBLIC_URL;

  if (!fileUrl.startsWith(publicUrlBase)) {
    console.warn(`File URL ${fileUrl} does not match R2 public URL ${publicUrlBase}. Skipping deletion.`);
    return;
  }

  const key = fileUrl.replace(`${publicUrlBase}/`, '');

  const command = new DeleteObjectCommand({
    Bucket: env.R2_BUCKET_NAME.trim(),
    Key: key,
  });

  try {
    await s3Client.send(command);
  } catch (err) {
    console.error(`Failed to delete ${key} from R2`, err);
  }
}
