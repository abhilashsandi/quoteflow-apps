# quoteflow-apps

Frontend/orchestration monorepo for QuoteFlow (fictional carriers: Acme Insurance and Vantage
Direct). Portfolio sample — see the root [README.md](./README.md) for the full architecture,
an architecture diagram, and setup instructions. This file is the fast-context version: the
rules an agent working in this repo needs before making a change.

## The two rules everything else depends on

1. **bff-gateway proxies quote data — it never owns it.** Every quote read/write goes through
   `apps/bff-gateway`'s HTTP client to `quoteflow-rating-service` (a separate repo, `:4000`).
   Don't add a direct Postgres connection for quotes to bff-gateway; if a feature seems to need
   one, it's asking Repo 1 for a new endpoint instead.
2. **The assistant's Postgres is a different database from Repo 1's.** `libs/ai-assistant`'s
   pgvector store (`:5433`, `quoteflow_assistant`) holds coverage-explainer *documents*, not
   quote data — that's what keeps rule 1 true even though bff-gateway does have a database
   connection now (see `apps/bff-gateway/src/assistant/`).

## Where things live

- `apps/customer-portal`, `apps/agent-portal` — same shared libs, same `/quote` page shape.
  The only portal-specific line is `portal: 'agent' | 'customer'` passed into
  `useCarrierRouteConfig()` (from `libs/form-renderer`) — that's what applies Repo 1's
  agent/customer override chain. If you're about to write agent-only or customer-only page
  logic, stop: the override almost certainly belongs in Repo 1's `routeConfigs/overrides.ts`
  instead, not here. `customer-portal` alone also has `quote/start` (GaQ, server-rendered, a
  Server Action in `actions.ts`) and `quote/compare` — both server-rendered, both carrier-
  agnostic; they only ever call bff-gateway server-side (never the browser), same as
  `lib/flags.ts`. `/quote` itself is a thin Server Component (`page.tsx`) around the real
  client logic in `QuoteClient.tsx` — split that way specifically so `page.tsx` can `await`
  `searchParams` (for `?resume=<quoteId>`) and hand `QuoteClient` a plain prop, not a Promise;
  reading a Promise prop via React's `use()` inside a client page component suspends with no
  Suspense boundary to catch it in this app's tests, so don't undo that split.
- `apps/bff-gateway` — NestJS. `src/quotes` proxies to Repo 1, `src/flags` evaluates feature
  flags, `src/assistant` runs the Gemini + RAG assistant. `src/telemetry/otel.ts` must stay the
  first import in `main.ts` (see docs/adr/0002 — auto-instrumentation patches modules at
  `require()` time).
- `apps/automation-worker` — the RabbitMQ consumer for `carrier.bind.requested`. Two bind
  mechanisms live here side by side, picked per job by `src/worker/bind-job-handler.ts`'s
  `API_DRIVEN_CARRIER_CODES` set (keyed off the job's `carrierCode`): Acme drives
  `src/mock-carrier-portal` (a bare Express app, deliberately not a React SPA, with a real
  three-page flow — login, an applicant-details form, then the bind form — each gated on the
  previous one being completed via an in-memory session Map) with Playwright; Vantage calls
  `src/mock-carrier-api` (a bare Express JSON API, bearer-token auth) directly with `fetch()`.
  The applicant-details page needs real driver-info answers, not just a quoteId —
  `bind-job-handler.ts` fetches those from Repo 1's `GET /internal/quotes/:quoteId` via
  `src/worker/rating-service-quote-lookup.ts` before calling the Playwright automation (never
  needed for the API-driven path). Adding a third carrier's bind mechanism means adding its own
  `runX(...)`-shaped function plus a branch (or a set entry) in that handler — everything else
  (retry reporting, the DLQ decision) is shared regardless of which mechanism runs.
  `src/cli/dlq-cli.ts` is the DLQ inspect/replay tool. The queue/DLQ topology here must match
  Repo 1's producer exactly (same exchange/queue names and arguments) — RabbitMQ rejects a
  mismatched re-declaration, so changing one side means changing both.
- `libs/state` — `useQuoteSession` and `useChatStream` are both Zustand-backed (module-level
  store, not `useState`), specifically so a long-running async function (streaming SSE,
  building history) can read the latest state via `.getState()` instead of a stale closure. If
  you add another hook with this "async function needs to read state it just set" shape, use
  the same pattern rather than reaching for `useState` + a ref-synced `useEffect`.
- `libs/form-renderer` — the browser-side half of Repo 1's two shipped-bundle patterns: a
  generic cached `import()` module loader (`module-loader.ts`) used by both the config loader
  (Pattern 1) and the validator loader (Pattern 2). Real dynamic imports use
  `new Function('specifier', 'return import(specifier);')` — a deliberate indirection, because
  every bundler's static analysis (Turbopack/webpack/Vite) rejects a literal
  `import(runtimeVariable)`.
- `libs/ai-assistant` — server-only, consumed by bff-gateway alone (it uses `pg` and
  `@google/genai`, neither of which belongs in a browser bundle). `seed/coverage-docs.ts` is
  the static knowledge base content; `apps/bff-gateway/src/assistant/seed-knowledge.ts` embeds
  and upserts it — run `npm run seed:assistant --prefix apps/bff-gateway` after changing a doc.

## Conventions worth knowing before you add code

- Every workspace lib's relative imports use explicit `.js` extensions
  (`tsconfig.base.json` sets `moduleResolution: nodenext`) — **except** inside the Next.js apps
  themselves (`apps/customer-portal`, `apps/agent-portal`), which use `moduleResolution:
  bundler` and Turbopack chokes on a `.js`-suffixed import of a `.tsx` file. Match whichever
  convention the file you're editing already uses.
- After adding a new cross-lib import, run `npx nx sync` — Nx's TypeScript project references
  need updating and `typecheck`/`build` will fail with a stale-reference error otherwise.
- Standard check sequence before committing: `npx nx run-many -t typecheck lint test -p
  <affected-projects>`, then a live check in the browser for anything UI-facing — type checks
  and unit tests verify correctness, not that the feature actually works end-to-end.
- Docker infra for local dev is started with plain `docker run`, never docker-compose in this
  repo — see the root README's Requirements section for the exact commands, including the
  assistant's separate Postgres.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
