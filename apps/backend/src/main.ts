import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { initTracing } from 'src/config/tracing';
import { AppModule } from './app.module';

initTracing();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('MentisHub API')
    .setDescription('API documentation for MentisHub platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  cleanupOpenApiDoc(document);

  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
