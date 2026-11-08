#!/bin/bash
# Daily database backup: streams a custom-format dump to private S3 storage.
# Reads DATABASE_URL, BACKUP_S3_URI, AWS_REGION, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.
set -euo pipefail

pg_dump "$DATABASE_URL" --format=custom | aws s3 cp - "$BACKUP_S3_URI/daily/sanpablo-$(date -u +%F).dump"
