# ADR-0002: Migrating bff-gateway off the legacy APM agent to OpenTelemetry

## Status

Accepted

## Context

Before this rewrite, bff-gateway's predecessor carried an in-house APM agent ("Sentinel") that
teams reached for the same way they reach for `@opentelemetry/auto-instrumentations-node`
today: dropped in early in the process's startup, it monkey-patched `http`, `express`, and the
outbound fetch client to emit spans without call-site changes. It had grown into exactly the
kind of thing this ADR series exists to avoid quietly perpetuating:

- **Vendor-locked.** Spans only ever went to one internal collector; there was no way to
  additionally (or instead) export to a team's own Jaeger/Tempo/whatever without forking the
  agent.
- **No semantic conventions.** Span and attribute names were whatever the original author
  chose in ~2019, predating OpenTelemetry's semantic-conventions package — every consumer
  (dashboards, alerts) had to know the agent's own naming scheme.
- **Unmaintained.** The agent shipped as a private internal package with no active owner;
  the last meaningful change was a Node 14 compatibility patch.
- **Inconsistent with quoteflow-rating-service.** That service (a separate team, built more
  recently) already used OpenTelemetry directly. A trace touching both services was two
  disconnected traces in two different systems, not one.

## Decision

Drop the legacy agent and adopt `@opentelemetry/sdk-node` with
`@opentelemetry/auto-instrumentations-node`, exporting to console by default (swappable for an
OTLP exporter pointed at a collector) — the same setup quoteflow-rating-service already uses,
down to the `telemetry/otel.ts` file name and the console-exporter default (see that service's
README for the OTLP/Jaeger swap instructions, which apply here unchanged).

The one non-negotiable carried over from the old agent, and the thing most likely to get
silently broken by a future refactor: **the SDK must be initialized before any instrumented
module is `require`'d.** Auto-instrumentation works by monkey-patching modules the first time
they load; starting the SDK after Nest/Express/undici are already loaded produces no spans and
no error — it just quietly does nothing. `src/telemetry/otel.ts` is imported as the literal
first line of `main.ts`, before even `@nestjs/core`, for exactly this reason.

## Consequences

- **Gained:** vendor-neutral traces using standard semantic conventions, one export path
  shared with quoteflow-rating-service (so a request that crosses the bff-gateway → rating-service
  boundary is one inspectable trace once both point at the same collector), and an
  ecosystem of instrumentation packages instead of one team's hand-maintained monkey-patches.
- **Given up:** the legacy agent had one convenience OpenTelemetry doesn't replicate
  out of the box — a config file that automatically redacted a list of PII field names from
  span attributes before export. Recreating that would need a custom `SpanProcessor`
  (`onStart`/`onEnd` hooks filtering attribute keys) layered on top of the SDK; not implemented
  here since this sample has no PII flowing through span attributes to begin with, but worth
  flagging for anyone lifting this setup into a service that does.
