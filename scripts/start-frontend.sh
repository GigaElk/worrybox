#!/bin/sh

# Exit on any error
set -e

echo "Starting WorryBox Frontend..."

# Create health check endpoint
echo '<!DOCTYPE html><html><head><title>Health Check</title></head><body><h1>OK</h1></body></html>' > /usr/share/nginx/html/health

# Start nginx
echo "Starting nginx..."
exec nginx -g 'daemon off;'