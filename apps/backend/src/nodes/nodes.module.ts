import { Module, forwardRef } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/auth.module';
import { DockerModule } from '../docker/docker.module';
import { FlowerModule } from '../flower/flower.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectsModule } from '../projects/projects.module';
import { TrainingModule } from '../training/training.module';
import { VaultModule } from '../vault/vault.module';
import { NodesController } from './controllers/nodes.controller';
import { OrgNodesController } from './controllers/org-nodes.controller';
import { NodeCertificateService } from './services/node-cert.service';
import { NodesService } from './services/nodes.service';

@Module({
  imports: [
    PrismaModule,
    VaultModule,
    AuthorizationModule,
    FlowerModule,
    ProjectsModule,
    DockerModule,
    forwardRef(() => TrainingModule),
  ],
  controllers: [OrgNodesController, NodesController],
  providers: [NodesService, NodeCertificateService],
  exports: [NodesService, NodeCertificateService],
})
export class NodesModule {}
