<div align="center">
  <img src="frontend/src/assets/WorryBoxLogoConcept.png" alt="WorryBox Logo" width="400">
</div>

# Worrybox

A compassionate social platform designed to help users externalize their worries through structured posting, optional elaboration, and supportive community interaction.

## Overview

Worrybox combines Twitter-like short-form worry posts with optional longer blog entries, featuring privacy controls, AI-moderated comments, and scheduling capabilities to create a safe, supportive environment for users to process their concerns.

## Features

- **Worry Posting**: Share concerns with structured prompts like "I am worried about..." or "I worry that..."
- **Privacy Controls**: Choose between public, friends-only, or private visibility
- **AI Moderation**: Protect vulnerable users with intelligent comment filtering
- **Community Support**: Connect with others facing similar concerns
- **Scheduling**: Post worries at appropriate times
- **Analytics**: Track patterns and progress (paid tiers)
- **Guided Exercises**: Access coping techniques and mental health resources
- **Multi-language Support**: Use the platform in your preferred language

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- React Router for navigation
- React Query for state management
- React Hook Form for form handling

### Backend
- Node.js with Express.js
- TypeScript for type safety
- PostgreSQL with Prisma ORM
- JWT authentication
- OpenAI integration for AI features
- Stripe for subscription management

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL 15+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/GigaElk/worrybox.git
cd worrybox
```

2. Install dependencies for all projects:
```bash
npm run install:all
```

3. Set up environment variables:
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration
```

4. Set up the database:
```bash
cd backend
npm run db:push
npm run db:generate
```

5. Start the development servers:
```bash
# From root directory
npm run dev
```

This will start:
- Frontend on http://localhost:3000
- Backend API on http://localhost:5000

## Project Structure

```
worrybox/
├── frontend/          # React TypeScript frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   └── ...
├── backend/           # Express TypeScript backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── models/        # Database models
│   │   ├── services/      # Business logic
│   │   └── ...
│   └── prisma/        # Database schema and migrations
└── .kiro/            # Kiro IDE specifications
    └── specs/worrybox/   # Project requirements and design
```

## Development

### Available Scripts

From the root directory:
- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both frontend and backend for production
- `npm run install:all` - Install dependencies for all projects

Backend specific:
- `npm run dev` - Start backend in development mode
- `npm run build` - Build backend for production
- `npm run test` - Run backend tests
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations

Frontend specific:
- `npm run dev` - Start frontend development server
- `npm run build` - Build frontend for production
- `npm run test` - Run frontend tests

## Contributing

This project follows a spec-driven development approach. See the `.kiro/specs/worrybox/` directory for detailed requirements, design, and implementation tasks.

📜 [Code of Conduct](CODE_OF_CONDUCT.md) — We’re committed to respectful and inclusive collaboration.

## License

MIT License - see LICENSE file for details.
