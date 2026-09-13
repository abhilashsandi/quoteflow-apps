// Must be the FIRST thing required by main.ts, before @nestjs/core/express/undici are
// required — auto-instrumentation works by monkey-patching those modules at require() time, so
// starting the SDK after they're already loaded silently produces no spans. Mirrors
// quoteflow-rating-service's own src/telemetry/otel.ts; see docs/adr/0002 for why bff-gateway
// carries this at all (it replaces a legacy in-house APM agent from before this rewrite).
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

/**
 * Console exporter by default for this sample — swap in an OTLP exporter pointed at a local
 * collector/Jaeger for a UI. Spans per incoming HTTP request and per outbound call (the
 * rating-service proxy, Postgres) come from @opentelemetry/auto-instrumentations-node, not
 * hand-written spans — the same instrumentation source as quoteflow-rating-service, so a trace
 * that crosses the bff-gateway -> rating-service boundary is inspectable end-to-end once both
 * export to the same collector.
 */
const sdk = new NodeSDK({
  resource: new Resource({ [ATTR_SERVICE_NAME]: 'bff-gateway' }),
  traceExporter: new ConsoleSpanExporter(),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();

function shutdown(): void {
  sdk.shutdown().catch((err: unknown) => {
    console.error('Error shutting down OpenTelemetry SDK', err);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
