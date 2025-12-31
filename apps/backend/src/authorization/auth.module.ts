import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from './auth.guard';
import { AuthorizationService } from './auth.service';

@Module({
  imports: [PrismaModule],
  providers: [AuthorizationService, RolesGuard],
  exports: [RolesGuard],
})
export class AuthorizationModule {}
