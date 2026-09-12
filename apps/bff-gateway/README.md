# bff-gateway

The NestJS API `customer-portal` and `agent-portal` actually call. It has **no direct Postgres
connection** — every quote read/write is a proxied call to `quoteflow-rating-service` via
`RATING_SERVICE_URL`. It also owns feature-flag evaluation, the fake session/auth layer, and
the AI-assistant chat endpoint (both land in later milestones).

## Env vars

Copy `.env.example` to `.env`. `RATING_SERVICE_URL` is required — the process fails fast at
startup if it's missing, same convention as `quoteflow-rating-service`.

| Var | Required | Example |
|---|---|---|
| `RATING_SERVICE_URL` | yes | `http://localhost:4000` |
| `PORT` | no (default `4100`) | |
| `CORS_ORIGINS` | no | `http://localhost:3000,http://localhost:3001` |

## Routes (proxied to quoteflow-rating-service)

| Method & path | Proxies to |
|---|---|
| `GET /health` | — (local liveness check) |
| `POST /quotes` | `POST /quotes` |
| `GET /quotes/:quoteId/schemas` | `GET /quotes/:quoteId/schemas` |
| `PATCH /quotes/:quoteId` | `PATCH /quotes/:quoteId` |
| `POST /quotes/:quoteId/reports` | `POST /quotes/:quoteId/reports` |

A failed upstream call surfaces as the same status/error code the rating service returned
(`unwrapResult` in `src/quotes/unwrap-result.ts`); a network-level failure (rating service
unreachable) surfaces as `502 { error: "network_error" }` rather than crashing the request.

## Run

```bash
npm install
cp apps/bff-gateway/.env.example apps/bff-gateway/.env   # point RATING_SERVICE_URL at a running quoteflow-rating-service
npx nx serve bff-gateway
```
