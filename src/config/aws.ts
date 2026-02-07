import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';
import { SESClient } from '@aws-sdk/client-ses';
import { env } from './env.js';

const awsConfig = {
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  ...(env.AWS_ENDPOINT_URL && {
    endpoint: env.AWS_ENDPOINT_URL,
    forcePathStyle: true, // Required for LocalStack
  }),
};

export const s3Client = new S3Client(awsConfig);
export const sqsClient = new SQSClient(awsConfig);
export const sesClient = new SESClient(awsConfig);
