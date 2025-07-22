#!/bin/sh

# Exit on any error
set -e

echo "Starting WorryBox Backend..."

# Wait for database to be ready
echo "Waiting for database connection..."
until npx prisma db push --accept-data-loss; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "Database is ready!"

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Start the application
echo "Starting application server..."
exec node dist/server.js