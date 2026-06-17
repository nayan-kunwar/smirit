import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

export interface TracingOptions {
  serviceName: string;
  exporterUrl: string;
}

/**
 * Initialize OpenTelemetry tracing for a service. Call once, as early as
 * possible in the process bootstrap (before other modules are imported where
 * feasible). Returns a shutdown handle for graceful termination.
 */
export function startTracing(options: TracingOptions): { shutdown: () => Promise<void> } {
  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: options.serviceName,
    }),
    traceExporter: new OTLPTraceExporter({
      url: `${options.exporterUrl.replace(/\/$/, '')}/v1/traces`,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();

  return {
    shutdown: async () => {
      await sdk.shutdown();
    },
  };
}
