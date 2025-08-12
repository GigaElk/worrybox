# Worrybox Backend API

A Node.js/Express backend for the Worrybox mental health platform with PayPal subscriptions and Google AI integration.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Update database schema
npm run db:push

# Start development server
npm run dev
```

## 📁 Project Structure

```
backend/
├── src/                    # Source code
│   ├── controllers/        # API route controllers
│   ├── services/          # Business logic services
│   ├── middleware/        # Express middleware
│   ├── routes/           # API route definitions
│   └── utils/            # Utility functions
├── prisma/               # Database schema and migrations
├── docs/                 # 📚 Documentation
├── tests/                # 🧪 Test files and utilities
├── scripts/              # Deployment and utility scripts
└── dist/                 # Compiled JavaScript (generated)
```

## 🔧 Key Features

- **PayPal Integration**: Subscription management with live PayPal API
- **Google AI**: Content moderation and worry analysis
- **JWT Authentication**: Secure user authentication with 30-day tokens
- **SQL Server Database**: Azure SQL with Prisma ORM
- **TypeScript**: Full type safety throughout the codebase

## 📚 Documentation

All documentation is organized in the [`docs/`](./docs/) directory:

- **[PayPal Setup Guide](./docs/PAYPAL_SETUP_GUIDE.md)** - Complete PayPal integration setup
- **[AI Integration Summary](./docs/AI_INTEGRATION_SUMMARY.md)** - Google AI features overview
- **[Authentication Guide](./docs/AUTH_DEBUGGING_GUIDE.md)** - JWT troubleshooting
- **[Deployment Notes](./docs/DEPLOYMENT_NOTES.md)** - Production deployment guide

## 🧪 Testing

Test files and utilities are in the [`tests/`](./tests/) directory:

```bash
# Test PayPal integration
node tests/test-paypal-integration.js

# Test Google AI features
node tests/test-google-ai.js

# Create PayPal subscription plans
node tests/create-paypal-plans-simple.js
```

## 🛠 Development Commands

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build           # Build for production
npm start              # Start production server

# Database
npm run db:push        # Push schema changes to database
npm run db:generate    # Generate Prisma client
npm run db:studio      # Open Prisma Studio

# Testing
npm test              # Run test suite
```

## 🔑 Environment Variables

Required environment variables (see `.env.example`):

```env
# Database
DATABASE_URL=your-sql-server-connection-string

# JWT
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# PayPal
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_WEBHOOK_ID=your-webhook-id
PAYPAL_SUPPORTER_PLAN_ID=P-your-supporter-plan-id
PAYPAL_PREMIUM_PLAN_ID=P-your-premium-plan-id

# Google AI
GOOGLE_AI_API_KEY=your-google-ai-api-key
```

## 🌐 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token

### Subscriptions

- `GET /api/subscriptions/tiers` - Get subscription plans
- `POST /api/subscriptions/checkout` - Create PayPal subscription
- `POST /api/subscriptions/cancel` - Cancel subscription

### Posts & Comments

- `GET /api/posts/feed` - Get user feed
- `POST /api/posts` - Create worry post
- `POST /api/posts/:id/comments` - Add comment (AI moderated)

## 🚀 Deployment

The backend is configured for deployment on:

- **Render.com** (recommended)
- **Azure App Service**
- **Any Node.js hosting platform**

See [Deployment Notes](./docs/DEPLOYMENT_NOTES.md) for detailed instructions.

## 📞 Support

- Check the [docs/](./docs/) directory for detailed guides
- Run tests in [tests/](./tests/) to verify functionality
- Review error logs for troubleshooting

## 🎯 Current Status

✅ **Working Features:**

- PayPal subscription integration (live)
- Google AI content moderation
- JWT authentication with 30-day tokens
- Database schema with PayPal support

⚠️ **In Progress:**

- TypeScript compilation fixes
- Full backend server startup
