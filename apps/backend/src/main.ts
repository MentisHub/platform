import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initTracing } from 'src/config/tracing';

initTracing();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}

bootstrap().catch(() => {});
