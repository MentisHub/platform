import { Module } from '@nestjs/common';
import { APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ZodValidationPipe, ZodSerializerInterceptor } from 'nestjs-zod';
import { AuthenticationModule } from './authentication/auth.module';
import { AuthorizationModule } from './authorization/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { NodesModule } from './nodes/nodes.module';
import { PrismaModule } from './prisma/prisma.module';
import { VaultModule } from './vault/vault.module';
import { TrainingModule } from './training/training.module';
import { FlowerModule } from './flower/flower.module';
import { FabsModule } from './fabs/fabs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthenticationModule,
    AuthorizationModule,
    PrismaModule,
    OrganizationsModule,
    NodesModule,
    VaultModule,
    TrainingModule,
    FlowerModule,
    FabsModule,
  ],
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
