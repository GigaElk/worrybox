// Environment setup for tests
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Ensure NODE_ENV is set to test
process.env.NODE_ENV = 'test';

// Set default test values if not provided
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
}

if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only';
}

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/worrybox_test';
}

// Mock external services in test environment
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.LEMONSQUEEZY_API_KEY = 'test-lemonsqueezy-key';
process.env.LEMONSQUEEZY_STORE_ID = 'test-store-id';
process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'test-webhook-secret';
process.env.EMAIL_HOST = 'smtp.test.com';
process.env.EMAIL_PORT = '587';
process.env.EMAIL_USER = 'test@example.com';
process.env.EMAIL_PASS = 'test-password';
process.env.REDIS_URL = 'redis://localhost:6379';