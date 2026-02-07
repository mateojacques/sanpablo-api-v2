/**
 * Import Worker
 *
 * Processes CSV and bulk images import jobs from SQS queue.
 * Run this as a separate process: npx tsx src/workers/import-worker.ts
 */

/* eslint-disable no-console, no-constant-condition */

import { ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { eq } from 'drizzle-orm';
import { sqsClient } from '../config/aws.js';
import { env } from '../config/env.js';
import { db } from '../config/database.js';
import { importJobs } from '../db/schema/index.js';
import { importsService } from '../modules/imports/imports.service.js';

const POLL_INTERVAL_MS = 5000; // 5 seconds
const MAX_MESSAGES = 10;
const VISIBILITY_TIMEOUT = 300; // 5 minutes

interface ImportMessage {
  jobId: string;
  fileKey: string;
  type?: 'bulk_images' | 'csv';
}

/**
 * Poll SQS for import messages
 */
async function pollQueue(): Promise<void> {
  if (!env.SQS_IMPORT_QUEUE_URL) {
    console.error('SQS_IMPORT_QUEUE_URL is not configured');
    process.exit(1);
  }

  console.log('Import worker started, polling queue...');

  while (true) {
    try {
      const response = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: env.SQS_IMPORT_QUEUE_URL,
          MaxNumberOfMessages: MAX_MESSAGES,
          WaitTimeSeconds: 20, // Long polling
          VisibilityTimeout: VISIBILITY_TIMEOUT,
        })
      );

      const messages = response.Messages || [];

      if (messages.length === 0) {
        continue;
      }

      console.log(`Received ${messages.length} message(s)`);

      for (const message of messages) {
        if (!message.Body || !message.ReceiptHandle) {
          console.warn('Invalid message, skipping');
          continue;
        }

        try {
          const payload: ImportMessage = JSON.parse(message.Body);

          // Fetch job from database to get the type
          const job = await db.query.importJobs.findFirst({
            where: eq(importJobs.id, payload.jobId),
          });

          if (!job) {
            console.warn(`Job ${payload.jobId} not found, skipping`);
            // Delete message even if job not found
            await sqsClient.send(
              new DeleteMessageCommand({
                QueueUrl: env.SQS_IMPORT_QUEUE_URL,
                ReceiptHandle: message.ReceiptHandle,
              })
            );
            continue;
          }

          const jobType = job.type || payload.type || 'csv';
          console.log(`Processing import job: ${payload.jobId} (type: ${jobType})`);

          if (jobType === 'bulk_images') {
            await importsService.processBulkImagesJob(payload.jobId);
          } else {
            await importsService.processImportJob(payload.jobId);
          }

          // Delete message after successful processing
          await sqsClient.send(
            new DeleteMessageCommand({
              QueueUrl: env.SQS_IMPORT_QUEUE_URL,
              ReceiptHandle: message.ReceiptHandle,
            })
          );

          console.log(`Completed import job: ${payload.jobId}`);
        } catch (error) {
          console.error(`Failed to process message:`, error);
          // Message will become visible again after visibility timeout
        }
      }
    } catch (error) {
      console.error('Error polling queue:', error);
      // Wait before retrying on error
      await sleep(POLL_INTERVAL_MS);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Start worker
pollQueue().catch((error) => {
  console.error('Worker crashed:', error);
  process.exit(1);
});
