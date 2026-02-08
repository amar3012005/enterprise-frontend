# DaVinci AI - Deployment & Development Guide

## Project Overview
Multi-tenant AI agent dashboard system. 
- **Frontend**: Next.js 16 (React 19, Tailwind 4) - `enterprise.davinciai.eu`
- **Backend**: FastAPI (Python 3.11, PostgreSQL w/ SQLAlchemy asyncpg, Redis) - `api.enterprise.davinciai.eu`
- **Infrastructure**: Docker Compose, Traefik (Auto-SSL via Let's Encrypt), Redis 7-alpine, PostgreSQL 15-alpine.

## Key Architecture Patterns
1. **Multi-tenancy**: All data (Agents, Users, Wallets, CallLogs) must belong to a `tenant_id`.
2. **Session Ingestion**: Voice agents push "Enhanced Session Reports" to `POST /api/webhooks/session`.
3. **Real-time**: Redis is used for concurrency locking (`is_executing` flag) and session state.
4. **Security**: JWT-based authentication with `HS256`. 24h expiration.

## Development Commands
- **Backend**: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
- **Frontend**: `npm run dev`
- **Docker Build**: `docker compose build`

## Implementation Checklist for Agent
- [ ] **Infrastructure**: Create `docker-compose.yml` with Traefik, PG, Redis, BE, and FE.
- [ ] **Backend Docker**: Create `davinciai-backend/Dockerfile` (multi-stage python-slim).
- [ ] **Frontend Docker**: Create `davinciai-frontend/Dockerfile` (standalone output mode).
- [ ] **Auth**: Ensure `login` and `register` endpoints correctly interact with PostgreSQL.
- [ ] **Webhooks**: Implement `/webhooks/session` to ingest reports into `CallLog` table.
- [ ] **Dashboard API**: Ensure `/api/metrics/analytics` and `/api/metrics/calls` perform optimized DB lookups.
- [ ] **CORS**: Configure `CORSMiddleware` to allow `https://enterprise.davinciai.eu`.

## Deployment (Hetzner)
1. Set up A records for `enterprise.davinciai.eu` and `api.enterprise.davinciai.eu`.
2. Copy `.env.production` to `.env` and fill secrets.
3. Run `docker compose up -d`.
4. Run `docker compose exec backend python seed_db.py`.

## Style & Standards
- **Python**: Use `loguru` for logging. Use Pydantic v2 for models.
- **Next.js**: Use `App Router`. Use `standalone` output for production.
- **Frontend**: Premium aesthetics (glassmorphism, dark mode).
- **Database**: Use SQLAlchemy 2.0 async operations only.
