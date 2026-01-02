import { Module } from '@nestjs/common';
import { APP_PIPE, APP_INTERCEPTOR } from '@nestjs/core';
import { ZodValidationPipe, ZodSerializerInterceptor } from 'nestjs-zod';
import { AuthenticationModule } from './authentication/auth.module';
import { AuthorizationModule } from './authorization/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    AuthenticationModule,
    AuthorizationModule,
    PrismaModule,
    OrganizationsModule,
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
