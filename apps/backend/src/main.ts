import { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { initTracing } from 'src/config/tracing';
import { AppModule } from './app.module';

async function bootstrap() {
  const configService = new ConfigService();

  const httpsOptions: HttpsOptions = {};
  const certPath = configService.get<string>('BACKEND_CERT_PATH');
  const keyPath = configService.get<string>('BACKEND_KEY_PATH');
  const caPath = configService.get<string>('BACKEND_CA_PATH');

  if (certPath && keyPath && caPath) {
    httpsOptions.key = fs.readFileSync(keyPath);
    httpsOptions.cert = fs.readFileSync(certPath);
    httpsOptions.ca = fs.readFileSync(caPath);
    httpsOptions.requestCert = true;
    httpsOptions.rejectUnauthorized = false;
  }

  const app = await NestFactory.create(AppModule, { httpsOptions });

  const appConfigService = app.get(ConfigService);

  const otelUrl = appConfigService.get<string>('OTEL_EXPORTER_URL');
  const serviceName = appConfigService.get<string>('OTEL_SERVICE_NAME');

  if (otelUrl && serviceName) {
    initTracing({
      otelUrl,
      serviceName,
      certPath: appConfigService.get<string>('BACKEND_CERT_PATH'),
      keyPath: appConfigService.get<string>('BACKEND_KEY_PATH'),
      caPath: appConfigService.get<string>('BACKEND_CA_PATH'),
    });
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

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
