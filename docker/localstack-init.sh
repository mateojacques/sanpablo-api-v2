#!/bin/bash
# LocalStack initialization script
# Creates required AWS resources for local development

echo "Initializing LocalStack resources..."

# Create S3 bucket
awslocal s3 mb s3://sanpablo-assets
awslocal s3api put-bucket-cors --bucket sanpablo-assets --cors-configuration '{
  "CORSRules": [
    {
      "AllowedOrigins": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}'

# Create SQS queue for imports (explicit region)
awslocal sqs create-queue --queue-name sanpablo-import --region us-east-1

# Verify SES email (in LocalStack, all emails are automatically verified)
awslocal ses verify-email-identity --email-address pedidos@tutienda.com

echo "LocalStack initialization complete!"
echo "S3 Bucket: sanpablo-assets"
echo "SQS Queue: http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/sanpablo-import"
echo "SES Email: pedidos@tutienda.com"
