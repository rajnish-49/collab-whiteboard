# Collaborative Whiteboard

Real-time collaborative drawing app built with Next.js, Express, WebSocket, and PostgreSQL.

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

## Services

| Service | Port | Description |
|---------|------|-------------|
| web | 3000 | Next.js frontend |
| http-backend | 4001 | REST API |
| ws-backend | 4002 | WebSocket server |

## Features

- User authentication (signup/signin)
- Create and join rooms via slug
- Real-time collaborative drawing
- Drawing tools: pen, rectangle, circle, line, text, eraser
- Drawing persistence to database
