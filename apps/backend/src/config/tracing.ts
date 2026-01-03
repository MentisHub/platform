import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Logger } from '@nestjs/common';
import { readFileSync } from 'fs';

interface TracingConfig {
  otelUrl: string;
  serviceName: string;
  certPath?: string;
  keyPath?: string;
  caPath?: string;
}

export function initTracing({
  otelUrl,
  serviceName,
  certPath,
  keyPath,
  caPath,
}: TracingConfig) {
  const logger = new Logger('OpenTelemetry');

  const exporterConfig: {
    url: string;
    headers?: Record<string, string>;
    httpAgentOptions?: {
      cert?: Buffer;
      key?: Buffer;
      ca?: Buffer;
      rejectUnauthorized?: boolean;
    };
  } = {
    url: `${otelUrl}/v1/traces`,
  };

  if (certPath && keyPath && caPath) {
    try {
      exporterConfig.httpAgentOptions = {
        cert: readFileSync(certPath),
        key: readFileSync(keyPath),
        ca: readFileSync(caPath),
        rejectUnauthorized: true,
      };
      logger.log('mTLS enabled for OTEL Collector');
    } catch (error) {
      logger.warn(
        'Failed to load mTLS certificates, falling back to HTTP',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  const sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter(exporterConfig),
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
