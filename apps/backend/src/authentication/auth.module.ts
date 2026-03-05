import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthenticationService } from './auth.service';
import { AuthGuard } from './auth.guard';

@Module({
  providers: [
    AuthenticationService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [AuthenticationService],
})
export class AuthenticationModule {}
