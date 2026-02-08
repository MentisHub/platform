import { Logger } from '@nestjs/common';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { NodeSDK } from '@opentelemetry/sdk-node';

interface TracingConfig {
  otelUrl: string;
  serviceName: string;
}

export function initTracing({ otelUrl, serviceName }: TracingConfig) {
  const logger = new Logger('OpenTelemetry');

  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
      url: otelUrl,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
    serviceName,
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => logger.log('Tracing terminated'))
      .catch(() => {});
  });
}
