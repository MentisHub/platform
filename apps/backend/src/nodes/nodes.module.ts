import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/auth.module';
import { FlowerModule } from '../flower/flower.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectsModule } from '../projects/projects.module';
import { VaultModule } from '../vault/vault.module';
import { NodesController } from './controllers/nodes.controller';
import { OrgNodesController } from './controllers/org-nodes.controller';
import { NodesService } from './nodes.service';

@Module({
  imports: [
    PrismaModule,
    VaultModule,
    AuthorizationModule,
    FlowerModule,
    ProjectsModule,
  ],
  controllers: [OrgNodesController, NodesController],
  providers: [NodesService],
  exports: [NodesService],
})
export class NodesModule {}
