---                                                                                                                                     
  Implementation Summary                                                           
                                                                                                                                          
  Infrastructure (New Files)                                                                                                              
  ┌───────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────┐
  │             File              │                                          Description                                           │
  ├───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ docker-compose.yml            │ Production orchestration with Traefik v3 (auto-SSL), PostgreSQL 15, Redis 7, backend, frontend │
  ├───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ davinciai-backend/Dockerfile  │ Multi-stage python:3.11-slim build with healthcheck, connection pooling                        │
  ├───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ davinciai-frontend/Dockerfile │ Multi-stage node:20-alpine build with standalone output, non-root user                         │
  ├───────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ .env.production               │ Template with all required secrets documented                                                  │
  └───────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────┘
  Backend - New Files
  ┌──────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────┐
  │           File           │                                           Description                                            │
  ├──────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ app/auth/dependencies.py │ JWT middleware: get_current_user, get_current_tenant, get_token_payload, require_admin           │
  ├──────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ app/webhooks/session.py  │ POST /api/webhooks/session - ingests voice agent session reports, resolves agent, deducts wallet │
  └──────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────┘
  Backend - Rewritten Files (Mock Data -> Real DB Queries)
  File: app/main.py
  Key Changes: Production CORS (configurable origins), request logging middleware, error handlers, session webhook router
  ────────────────────────────────────────
  File: app/database/models.py
  Key Changes: Added Transaction model with wallet relationship
  ────────────────────────────────────────
  File: app/database/session.py
  Key Changes: Connection pooling (pool_size=10, max_overflow=20), pool_pre_ping, conditional echo
  ────────────────────────────────────────
  File: app/metrics/router.py
  Key Changes: All mock data removed. Real SQLAlchemy queries: aggregations, hourly trends, cost buckets, active calls. JWT-protected.
  ────────────────────────────────────────
  File: app/wallet/router.py
  Key Changes: All mock data removed. Real wallet balance, transactions from DB, top-up with transaction recording. Tenant isolation.
  ────────────────────────────────────────
  File: app/webhooks/cartesia.py
  Key Changes: Full DB integration: creates CallLog, deducts from wallet, records transactions
  ────────────────────────────────────────
  File: app/agents/router.py
  Key Changes: Added POST / (create), PUT /{id} (update), DELETE /{id} (soft-delete). All with tenant isolation.
  ────────────────────────────────────────
  File: app/tenants/router.py
  Key Changes: Real agent stats via batch CallLog aggregation. JWT-protected with tenant isolation.
  ────────────────────────────────────────
  File: app/auth/router.py
  Key Changes: Completed GET /me endpoint with proper JWT validation
  Frontend Changes
  ┌──────────────────────────┬────────────────────────────────────────────────────────────────────┐
  │           File           │                            Key Changes                             │
  ├──────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ lib/api.ts               │ New - API utility with apiUrl() and apiFetch() (auto-attaches JWT) │
  ├──────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ next.config.ts           │ Added output: "standalone", wildcard API rewrite                   │
  ├──────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ app/login/page.tsx       │ All 3 hardcoded URLs replaced with apiUrl(), auth header added     │
  ├──────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ context/AgentContext.tsx │ fetch() replaced with apiFetch()                                   │
  ├──────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ analytics/page.tsx       │ fetch() replaced with apiFetch()                                   │
  ├──────────────────────────┼────────────────────────────────────────────────────────────────────┤
  │ calls/page.tsx           │ fetch() replaced with apiFetch()                                   │
  └──────────────────────────┴────────────────────────────────────────────────────────────────────┘
  Deployment Steps

  cd /root/abella4
  cp .env.production .env
  # Edit .env with real POSTGRES_PASSWORD and JWT_SECRET
  docker compose build
  docker compose up -d
  docker compose exec backend python seed_db.py