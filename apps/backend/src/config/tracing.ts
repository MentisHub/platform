import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';

interface TracingConfig {
  otelUrl: string;
  serviceName: string;
}

export function initTracing({ otelUrl, serviceName }: TracingConfig) {
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
