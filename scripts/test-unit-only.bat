@echo off
echo 🧪 Running Unit Tests Only
echo =========================

cd backend
npm run test:unit

if %errorlevel% neq 0 (
    echo ❌ Unit tests failed!
    exit /b 1
)

echo ✅ Unit tests passed!
cd ..