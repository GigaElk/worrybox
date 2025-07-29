#!/bin/bash

# Local testing script for Worrybox
echo "🧪 Running Worrybox Tests Locally"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Test backend
echo "📦 Testing Backend..."
cd backend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📥 Installing backend dependencies..."
    npm install
fi

# Run tests
echo "🧪 Running backend tests..."
npm run test:ci

if [ $? -eq 0 ]; then
    echo "✅ Backend tests passed!"
else
    echo "❌ Backend tests failed!"
    exit 1
fi

cd ..

# Test frontend
echo "📦 Testing Frontend..."
cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📥 Installing frontend dependencies..."
    npm install
fi

# Run linting
echo "🔍 Running frontend linting..."
npm run lint

if [ $? -eq 0 ]; then
    echo "✅ Frontend linting passed!"
else
    echo "❌ Frontend linting failed!"
    exit 1
fi

# Run tests
echo "🧪 Running frontend tests..."
npm run test -- --run

if [ $? -eq 0 ]; then
    echo "✅ Frontend tests passed!"
else
    echo "❌ Frontend tests failed!"
    exit 1
fi

# Build frontend
echo "🏗️ Building frontend..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Frontend build successful!"
else
    echo "❌ Frontend build failed!"
    exit 1
fi

cd ..

echo ""
echo "🎉 All tests passed! Your project is ready for GitHub."
echo "💡 You can now push to GitHub and the CI/CD pipeline should work."