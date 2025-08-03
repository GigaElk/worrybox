#!/bin/bash

echo "🔄 Updating Dependencies and Fixing Security Issues"
echo "==================================================="

echo "📦 Updating Backend Dependencies..."
cd backend

echo "🔍 Checking for vulnerabilities..."
npm audit

echo "🔧 Installing updated packages..."
npm install

echo "🔍 Re-checking vulnerabilities..."
npm audit

echo "📦 Updating Frontend Dependencies..."
cd ../frontend

echo "🔍 Checking for vulnerabilities..."
npm audit

echo "🔧 Installing updated packages..."
npm install

echo "🔍 Re-checking vulnerabilities..."
npm audit

cd ..

echo "✅ Dependency update complete!"
echo "💡 Run 'npm test' in both directories to ensure everything still works."