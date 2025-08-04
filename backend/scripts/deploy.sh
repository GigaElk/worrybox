#!/bin/bash

# Render.com deployment script for Worrybox backend
echo "🚀 Starting Worrybox backend deployment..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations (if needed)
echo "🗄️ Running database migrations..."
npx prisma db push --accept-data-loss

# Build the application
echo "🏗️ Building application..."
npm run build

echo "✅ Deployment preparation complete!"