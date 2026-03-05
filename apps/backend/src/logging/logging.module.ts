import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { trace } from '@opentelemetry/api';
import { Request, Response } from 'express';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDevelopment = config.get('NODE_ENV') !== 'production';

        return {
          pinoHttp: {
            level: isDevelopment ? 'debug' : 'info',
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                '*.password',
                '*.token',
                '*.accessToken',
                '*.refreshToken',
                '*.apiKey',
                '*.secret',
                '*.psk',
              ],
              censor: '[REDACTED]',
            },
            transport: isDevelopment
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    translateTime: 'yyyy-mm-dd HH:MM:ss.l',
                    ignore: 'pid,hostname',
                    singleLine: false,
                    levelFirst: true,
                  },
                }
              : undefined,
            formatters: {
              level: (label: string) => ({ level: label }),
            },
            mixin() {
              const span = trace.getActiveSpan();
              if (span) {
                const spanContext = span.spanContext();
                return {
                  trace_id: spanContext.traceId,
                  span_id: spanContext.spanId,
                  trace_flags: spanContext.traceFlags,
                };
              }
              return {};
            },
            serializers: {
              req: (req: Request) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                query: req.query,
                params: req.params,
              }),
              res: (res: Response) => ({
                statusCode: res.statusCode,
              }),
              err: (err: Error) => ({
                type: err.name,
                message: err.message,
                stack: err.stack,
              }),
            },
            autoLogging: {
              ignore: (req: Request) =>
                req.url === '/health' || req.url === '/metrics',
            },
            customProps: (req: Request) => ({
              user_id: req.auth?.payload.sub,
              organization_id: req.orgMembership?.organizationId,
              project_id: req.projectMembership?.projectId,
            }),
          },
        };
      },
    }),
  ],
})
export class LoggingModule {}
