import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AuthenticationModule } from './authentication/auth.module';
import { AuthorizationModule } from './authorization/auth.module';
import { FabsModule } from './fabs/fabs.module';
import { FlowerModule } from './flower/flower.module';
import { HealthController } from './health/health.controller';
import { NodesModule } from './nodes/nodes.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PrismaModule } from './prisma/prisma.module';
import { TrainingModule } from './training/training.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
    }),
    AuthenticationModule,
    AuthorizationModule,
    PrismaModule,
    OrganizationsModule,
    NodesModule,
    TrainingModule,
    FlowerModule,
    FabsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
  ],
})
export class AppModule {}
