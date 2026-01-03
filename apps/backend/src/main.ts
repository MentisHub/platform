import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { initTracing } from 'src/config/tracing';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const otelUrl = configService.get<string>('OTEL_EXPORTER_URL');
  const serviceName = configService.get<string>('OTEL_SERVICE_NAME');

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

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
