import { Module } from '@nestjs/common';
import { NodesService } from './nodes.service';
import { OrgNodesController } from './controllers/org-nodes.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { VaultModule } from '../vault/vault.module';
import { AuthorizationModule } from '../authorization/auth.module';
import { NodesController } from './controllers/nodes.controller';

@Module({
  imports: [PrismaModule, VaultModule, AuthorizationModule],
  controllers: [OrgNodesController, NodesController],
  providers: [NodesService],
  exports: [NodesService],
})
export class NodesModule {}
