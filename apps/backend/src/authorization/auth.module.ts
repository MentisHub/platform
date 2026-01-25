import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from './auth.guard';
import { AuthorizationService } from './auth.service';

@Module({
  imports: [PrismaModule],
  providers: [
    AuthorizationService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AuthorizationModule {}
