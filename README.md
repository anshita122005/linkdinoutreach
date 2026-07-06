# AI Executive Outreach Copilot

A production-oriented monorepo foundation for the AI Executive Outreach Copilot platform.

## Architecture

- Frontend: Next.js 15 + TypeScript + Tailwind + shadcn-inspired UI primitives + TanStack Query + Axios
- Backend: Express + TypeScript + Prisma + PostgreSQL + Zod + Helmet + CORS + Morgan + Compression
- Database: PostgreSQL with Prisma client generation and health-based connectivity verification

## Local development

1. Create the PostgreSQL database:
   - `createdb linkedinoutreal1`
2. Copy the environment examples if needed:
   - `cp backend/.env.example backend/.env`
   - `cp frontend/.env.local.example frontend/.env.local`
3. Install dependencies:
   - `npm install --prefix frontend`
   - `npm install --prefix backend`
4. Generate the Prisma client:
   - `npm --prefix backend run prisma:generate`
5. Start the services:
   - `npm run dev:backend`
   - `npm run dev:frontend`

## Health check

- Backend health endpoint: http://localhost:4000/api/v1/health
- Frontend dashboard: http://localhost:3000

## Notes

This phase focuses on the foundation only. Future product features will plug into the modular structure introduced here.
