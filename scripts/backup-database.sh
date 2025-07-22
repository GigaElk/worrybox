#!/bin/bash

# Database backup script for WorryBox
# This script creates a backup of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="worrybox_backup_${DATE}.sql"
RETENTION_DAYS=7

# Load environment variables
source .env.production

echo "Starting database backup..."

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

# Create database backup
docker exec worrybox-postgres pg_dump \
  -U ${POSTGRES_USER} \
  -d ${POSTGRES_DB} \
  --no-password \
  --verbose \
  --clean \
  --if-exists \
  --create > ${BACKUP_DIR}/${BACKUP_FILE}

# Compress the backup
gzip ${BACKUP_DIR}/${BACKUP_FILE}

echo "Database backup completed: ${BACKUP_DIR}/${BACKUP_FILE}.gz"

# Clean up old backups (keep only last 7 days)
find ${BACKUP_DIR} -name "worrybox_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "Old backups cleaned up (retention: ${RETENTION_DAYS} days)"

# Optional: Upload to cloud storage (uncomment and configure as needed)
# aws s3 cp ${BACKUP_DIR}/${BACKUP_FILE}.gz s3://your-backup-bucket/database/
# echo "Backup uploaded to S3"

echo "Backup process completed successfully"