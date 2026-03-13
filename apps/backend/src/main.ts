import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { initTracing } from 'src/config/tracing';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const appConfigService = app.get(ConfigService);

  const otelUrl = appConfigService.get<string>('OTEL_EXPORTER_URL');
  const serviceName = appConfigService.get<string>('OTEL_SERVICE_NAME');

  if (otelUrl && serviceName) {
    initTracing({ otelUrl, serviceName });
  }

  const config = new DocumentBuilder()
    .setTitle('MentisHub API')
    .setDescription('API documentation for MentisHub platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, cleanupOpenApiDoc(document));

  await app.listen(3000);
}

bootstrap().catch((error: Error) => {
  console.error(
    JSON.stringify({
      level: 'fatal',
      msg: 'Failed to start application',
      err: {
        type: error.name,
        message: error.message,
        stack: error.stack,
      },
      time: Date.now(),
    }),
  );
  process.exit(1);
});
