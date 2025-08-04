@echo off
REM Render.com deployment script for Worrybox backend
echo 🚀 Starting Worrybox backend deployment...

REM Install dependencies
echo 📦 Installing dependencies...
call npm ci
if %errorlevel% neq 0 exit /b %errorlevel%

REM Generate Prisma client
echo 🔧 Generating Prisma client...
call npx prisma generate
if %errorlevel% neq 0 exit /b %errorlevel%

REM Run database migrations (if needed)
echo 🗄️ Running database migrations...
call npx prisma db push --accept-data-loss
if %errorlevel% neq 0 exit /b %errorlevel%

REM Build the application
echo 🏗️ Building application...
call npm run build
if %errorlevel% neq 0 exit /b %errorlevel%

echo ✅ Deployment preparation complete!