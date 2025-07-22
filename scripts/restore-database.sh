#!/bin/bash

# Database restore script for WorryBox
# Usage: ./restore-database.sh <backup_file>

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 /backups/worrybox_backup_20240101_120000.sql.gz"
    exit 1
fi

BACKUP_FILE=$1

# Load environment variables
source .env.production

echo "Starting database restore from: ${BACKUP_FILE}"

# Check if backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file ${BACKUP_FILE} not found"
    exit 1
fi

# Confirm restore operation
read -p "This will replace the current database. Are you sure? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled"
    exit 1
fi

# Stop the application
echo "Stopping application..."
docker-compose -f docker-compose.prod.yml stop backend

# Restore database
echo "Restoring database..."
if [[ ${BACKUP_FILE} == *.gz ]]; then
    # Compressed backup
    gunzip -c ${BACKUP_FILE} | docker exec -i worrybox-postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}
else
    # Uncompressed backup
    docker exec -i worrybox-postgres psql -U ${POSTGRES_USER} -d ${POSTGRES_DB} < ${BACKUP_FILE}
fi

echo "Database restore completed"

# Start the application
echo "Starting application..."
docker-compose -f docker-compose.prod.yml start backend

echo "Restore process completed successfully"