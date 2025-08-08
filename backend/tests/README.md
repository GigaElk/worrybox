# Worrybox Backend Tests & Utilities

This directory contains test files and utility scripts for the Worrybox backend.

## 🧪 Test Files

### Integration Tests
- **[test-paypal-integration.js](./test-paypal-integration.js)** - Complete PayPal integration test
- **[test-google-ai.js](./test-google-ai.js)** - Google AI functionality test
- **[test-paypal-auth.js](./test-paypal-auth.js)** - PayPal authentication test
- **[test-ai-integration.js](./test-ai-integration.js)** - AI integration test

### Connection Tests
- **[test-azure-direct.js](./test-azure-direct.js)** - Azure database connection test
- **[test-connection.js](./test-connection.js)** - General connection test

## 🔧 Setup Utilities

### PayPal Setup
- **[create-paypal-plans.js](./create-paypal-plans.js)** - Create PayPal subscription plans
- **[create-paypal-plans-simple.js](./create-paypal-plans-simple.js)** - Simplified PayPal plan creation

## 🚀 How to Run Tests

### PayPal Integration Test
```bash
node tests/test-paypal-integration.js
```

### Google AI Test
```bash
node tests/test-google-ai.js
```

### Create PayPal Plans
```bash
# Edit the credentials in the file first
node tests/create-paypal-plans-simple.js
```

## 📋 Test Results

All tests should show:
- ✅ Authentication working
- ✅ API calls successful
- ✅ Integration ready

## 🔍 Troubleshooting

If tests fail:
1. Check your API keys in `.env`
2. Verify internet connection
3. Check API rate limits
4. Review the relevant documentation in `../docs/`

## 📁 Test Structure

```
tests/
├── README.md                          # This file
├── test-paypal-integration.js         # PayPal integration test
├── test-google-ai.js                  # Google AI test
├── create-paypal-plans-simple.js      # PayPal setup utility
└── [other test files]                 # Additional tests
```