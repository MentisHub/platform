import { Module } from '@nestjs/common';
import { AuthenticationModule } from './authentication/auth.module';
import { AuthorizationModule } from './authorization/auth.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [AuthenticationModule, AuthorizationModule, PrismaModule],
})
export class AppModule {}
