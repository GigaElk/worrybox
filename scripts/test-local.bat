@echo off
echo 🧪 Running Worrybox Tests Locally
echo ==================================

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Please run this script from the project root directory
    exit /b 1
)

REM Test backend
echo 📦 Testing Backend...
cd backend

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📥 Installing backend dependencies...
    npm install
)

REM Run tests
echo 🧪 Running backend tests...
npm run test:ci

if %errorlevel% neq 0 (
    echo ❌ Backend tests failed!
    exit /b 1
)

echo ✅ Backend tests passed!
cd ..

REM Test frontend
echo 📦 Testing Frontend...
cd frontend

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📥 Installing frontend dependencies...
    npm install
)

REM Run linting
echo 🔍 Running frontend linting...
npm run lint

if %errorlevel% neq 0 (
    echo ❌ Frontend linting failed!
    exit /b 1
)

echo ✅ Frontend linting passed!

REM Run tests
echo 🧪 Running frontend tests...
npm run test -- --run

if %errorlevel% neq 0 (
    echo ❌ Frontend tests failed!
    exit /b 1
)

echo ✅ Frontend tests passed!

REM Build frontend
echo 🏗️ Building frontend...
npm run build

if %errorlevel% neq 0 (
    echo ❌ Frontend build failed!
    exit /b 1
)

echo ✅ Frontend build successful!
cd ..

echo.
echo 🎉 All tests passed! Your project is ready for GitHub.
echo 💡 You can now push to GitHub and the CI/CD pipeline should work.