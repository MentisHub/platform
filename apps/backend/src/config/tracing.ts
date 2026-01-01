import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';

export function initTracing() {
  const otelUrl = process.env.OTEL_EXPORTER_URL || 'http://otel-collector:4318';
  const serviceName = process.env.OTEL_SERVICE_NAME || 'platform';

  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
      url: `${otelUrl}/v1/traces`,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
    serviceName,
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch(() => {});
  });
}
