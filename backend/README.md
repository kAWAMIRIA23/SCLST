# SLCTS Core API — Node.js Backend

**Smart Logistics & Cargo Transit System (SLCTS)** production API engine built with **Node.js**, **TypeScript**, and **Express**. Handles admin oversight, driver lifecycle, booking operations, financial ledger escrow, and real-time telemetry over WebSocket.

| Runtime | Version |
|---------|---------|
| Node.js | 18+ recommended |
| PostgreSQL | 14+ |
| Module system | ESM (`"type": "module"`) |

---

## 1. System Architectural Paradigm

The backend follows a **modular clean layered architecture**. Each layer has a single responsibility; dependencies flow inward (HTTP → business logic → data/infra). No layer skips its neighbor.

```
HTTP Request
    │
    ▼
routes/           Path wiring, middleware attachment (thin)
    │
    ▼
middlewares/      JWT verification, async error wrapping, input helpers
    │
    ▼
controllers/      Zod validation, ApiResponse shaping (no SQL)
    │
    ▼
services/         Business rules, PostgreSQL queries, orchestration
    │
    ├── config/       Database pool, Zod-validated environment
    ├── constants/    Tier weights, commission rate, pagination bounds
    ├── models/       TypeScript interfaces, DB row types, mappers
    └── webSockets/   Telemetry gateway, dispatch push engine
```

### Layer reference

| Layer | Directory | Responsibility |
|-------|-----------|----------------|
| **Controllers** | `src/controllers/` | Parse HTTP input, call services, return `{ success, data }` JSON. Domains: `auth`, `admin`, `ledger`, `driver`. |
| **Services** | `src/services/` | Core business logic and data access. SQL lives here — never in controllers. |
| **Models** | `src/models/` | Strict TypeScript types for entities (`user`, `driver`, `booking`, `transaction`), JWT payloads, and `AppError`. |
| **Middlewares** | `src/middlewares/` | `requireAdmin` / `requireDriver` JWT gates, global `errorHandler`, `parseUuidParam`, `parsePagination`. |
| **Routes** | `src/routes/` | Express `Router` definitions — mount paths only, no business logic. |
| **Config** | `src/config/` | `database.ts` (pg pool), `env.ts` (startup validation). |
| **WebSockets** | `src/webSockets/` | Standalone WS server for driver telemetry and booking-offer dispatch. |

### Entry points

| File | Role |
|------|------|
| `src/server.ts` | Process bootstrap: validate env, start HTTP + WebSocket, graceful shutdown |
| `src/app.ts` | Express factory: CORS, JSON parser, route mounting, 404 + error handler |

Request flow example — admin releases escrow:

```
PATCH /api/admin/transactions/:id/release-escrow
  → ledger.routes.ts
  → requireAdmin (middlewares)
  → ledger.controller.releaseEscrow
  → ledger.service.releaseEscrow
  → config/database.query()
```

---

## 2. Environment Configuration (`.env`)

Copy the template below to `backend/.env`. All variables marked **required** are validated at startup by `src/config/env.ts` (Zod). The process exits immediately if validation fails.

```env
# ── Required ──────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:password@localhost:5432/slcts
JWT_SECRET=your_minimum_64_character_random_secret_string_change_this_in_production

# ── HTTP & WebSocket ports ────────────────────────────────────────────────────
PORT=3001
WS_PORT=4000

# ── Auth & security ───────────────────────────────────────────────────────────
JWT_EXPIRES_IN=8h
BCRYPT_SALT_ROUNDS=12

# ── Runtime ───────────────────────────────────────────────────────────────────
NODE_ENV=development
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string for `pg` pool |
| `JWT_SECRET` | Yes | — | HMAC secret for signing admin and driver JWTs |
| `PORT` | No | `3001` | Express HTTP listen port |
| `WS_PORT` | No | `4000` | WebSocket telemetry server port |
| `JWT_EXPIRES_IN` | No | `8h` | Token TTL passed to `jsonwebtoken` |
| `BCRYPT_SALT_ROUNDS` | No | `12` | bcrypt cost factor for password hashing |
| `NODE_ENV` | No | `development` | `development` \| `production` \| `test` |

> **Note:** `REDIS_URL` is not used by the current codebase. Session state and dispatch queues are handled in-process (PostgreSQL + in-memory WebSocket registry). Add `REDIS_URL` when introducing a distributed cache or job queue.

A starter file is also available at [`.env.example`](.env.example).

---

## 3. Installation & Bootstrapping

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ with the `slcts` database provisioned ([`../database/README.md`](../database/README.md))
- `psql` CLI (for schema apply) or run `.\setup-db.ps1` on Windows

### Dependency hydration

```bash
cd backend
npm install
```

### Database setup (first time)

**Windows (PowerShell):**

```powershell
cd backend
.\setup-db.ps1
```

**Manual (cross-platform):**

```bash
psql -U postgres -c "CREATE DATABASE slcts;"
psql postgresql://postgres:password@localhost:5432/slcts -f sql/schema.sql
```

Seed the default admin account:

```bash
npm run seed:admin
# Credentials: admin@slcts.ug / AdminSecure@2025
```

Configure `.env` (see section 2). At minimum set `DATABASE_URL` and `JWT_SECRET`.

### TypeScript compilation

```bash
npm run build
```

Output is emitted to `dist/` mirroring `src/`. Production entry: `dist/server.js`.

### Hot-reloading engine startup (development)

```bash
npm run dev
```

Starts `tsx watch src/server.ts` — HTTP API on `PORT` (default **3001**) and WebSocket telemetry on `WS_PORT` (default **4000**).

### Production start

```bash
npm run build
npm start
```

---

## 4. Primary API Route Manifest

All JSON responses use the envelope `{ "success": boolean, "data"?: T, "error"?: string }`.

**Auth legend:** `Public` = no token · `Admin` = `Authorization: Bearer <admin JWT>` · `Driver` = `Authorization: Bearer <driver JWT>`

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/admin/auth/login` | Public | Admin email/password login; returns JWT |

### Admin — dashboard & fleet oversight

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/dashboard/stats` | Admin | Active transits, today's revenue/commission, pending verifications |
| `GET` | `/api/admin/bookings` | Admin | Latest 50 bookings |
| `GET` | `/api/admin/drivers` | Admin | All registered drivers |
| `GET` | `/api/admin/drivers/pending` | Admin | Paginated pending verifications (`?page=&limit=`) |
| `PATCH` | `/api/admin/drivers/:id/verify` | Admin | Approve or reject driver (`{ "status": "APPROVED" \| "REJECTED" }`) |

### Financial oversight (ledger)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/admin/transactions` | Admin | Transaction ledger listing |
| `PATCH` | `/api/admin/transactions/:id/release-escrow` | Admin | Release held escrow to driver payout |

### Driver — mobile / field operations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/driver/onboarding` | Public | Register or re-login by phone; returns driver JWT |
| `GET` | `/api/driver/me` | Driver | Driver profile and earnings stats |
| `PATCH` | `/api/driver/status` | Driver | Toggle online availability (`{ "is_online": true \| false }`) |
| `PATCH` | `/api/driver/bookings/:id/accept` | Driver | Accept a REQUESTED booking |
| `PATCH` | `/api/driver/bookings/:id/complete` | Driver | Mark active booking COMPLETED |
| `POST` | `/api/driver/dispatch/simulate` | Driver | Create and push a demo booking offer (QA) |

### Live streaming — WebSocket telemetry

The telemetry server runs on a **separate port** from HTTP (`WS_PORT`, default `4000`). It is not mounted under the Express app.

| Endpoint | Purpose |
|----------|---------|
| `ws://localhost:4000/telemetry?driver_id=<uuid>` | Driver connects to receive booking offers and send GPS updates |
| Broadcast channel | All connected clients except the sender receive `{ driver_id, latitude, longitude }` payloads (admin fleet map) |

**Driver connection example:**

```
ws://localhost:4000/telemetry?driver_id=550e8400-e29b-41d4-a716-446655440000
```

**Outbound message — booking offer (from dispatch gateway):**

```json
{
  "booking_id": "uuid",
  "pickup_address": "Nakawa Industrial Area, Kampala",
  "dropoff_address": "Entebbe Airport Cargo Terminal",
  "cargo_type": "GENERAL",
  "payload_weight_tonnes": 5,
  "fare_ugx": 450000,
  "distance_km": 42
}
```

**Inbound message — GPS telemetry (from driver app):**

```json
{
  "driver_id": "550e8400-e29b-41d4-a716-446655440000",
  "latitude": 0.3476,
  "longitude": 32.5825
}
```

> Admin clients connect to the same `/telemetry` endpoint (without `driver_id` or with a monitoring client) to receive broadcast GPS frames from all active drivers.

---

## Project structure

```
backend/
├── README.md                 ← this file
├── package.json
├── tsconfig.json
├── .env.example
├── setup-db.ps1              ← Windows DB bootstrap
├── sql/
│   ├── schema.sql            ← canonical PostgreSQL DDL
│   └── 002_auth_password_hash.sql
└── src/
    ├── server.ts             ← process entry
    ├── app.ts                ← Express factory
    ├── config/
    ├── constants/
    ├── controllers/
    ├── middlewares/
    ├── models/
    ├── routes/
    ├── services/
    ├── webSockets/
    └── scripts/
        └── seedAdmin.ts
```

## Related documentation

- [Database layer README](../database/README.md) — schema, ER map, `CHECK` constraints
- [`.env.example`](.env.example) — copy-paste environment template

## npm scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `tsx watch src/server.ts` | Development with hot reload |
| `build` | `tsc` | Compile TypeScript to `dist/` |
| `start` | `node dist/server.js` | Production server |
| `seed:admin` | `tsx src/scripts/seedAdmin.ts` | Insert default admin user |
