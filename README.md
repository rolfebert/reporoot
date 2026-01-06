# MariaDB API Example (Node.js + TypeScript + Express + Prisma)

This example shows a minimal but production-minded REST API backed by MariaDB.

Features:
- User registration and JWT auth (access + refresh tokens)
- CRUD for items
- Prisma for schema/migrations (MySQL connector works with MariaDB)
- Docker Compose for MariaDB and API
- Env configuration

Prereqs:
- Docker & docker-compose (for DB)
- Node 18+ and npm/yarn (for local development)
- Optional: npx prisma

Quick start (dev):
1. Copy .env.example -> .env and update secrets if you wish.
2. Start MariaDB:
   docker-compose up -d
3. Install deps:
   npm install
4. Generate Prisma client and run migrations:
   npx prisma generate
   npx prisma migrate dev --name init
5. Start server (dev):
   npm run dev
6. API available at http://localhost:4000/api/v1

Notes:
- The prisma connector uses the MySQL driver which is compatible with MariaDB.
- Refresh token handling in this example stores tokens in DB (simple). In production consider rotating stored tokens and storing in secure store.
