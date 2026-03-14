# Collaborative Whiteboard

Real-time collaborative drawing app built with Next.js, Express, WebSocket, and PostgreSQL.

## Architecture

- `apps/web`: Next.js frontend for auth, room flow, and whiteboard UI
- `apps/http-backend`: Express API for signup/signin, room creation, room lookup, and drawing fetch/save
- `apps/ws-backend`: WebSocket server for live room presence and drawing sync
- `packages/common`: shared Zod request schemas
- `packages/db`: shared Prisma client and schema

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS
- **Backend:** Express.js (HTTP), WebSocket (real-time)
- **Database:** PostgreSQL (Neon), Prisma ORM
- **Auth:** JWT, bcrypt
- **Monorepo:** Turborepo, pnpm

## Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

# Run database migrations
pnpm --filter @repo/db exec prisma migrate dev

# Start development servers
pnpm dev
```

The frontend runs on `http://localhost:4000`.

## Services

| Service | Port | Description |
|---------|------|-------------|
| web | 4000 | Next.js frontend |
| http-backend | 4001 | REST API |
| ws-backend | 4002 | WebSocket server |

## Environment Variables

```bash
DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require"
JWT_SECRET="replace-with-a-long-random-secret"
NEXT_PUBLIC_API_URL="http://localhost:4001"
NEXT_PUBLIC_WS_URL="ws://localhost:4002"
```

## Features

- User authentication (signup/signin)
- Create and join rooms via slug
- Real-time collaborative drawing
- Drawing tools: pen, rectangle, circle, line, text, eraser
- Drawing persistence to database
