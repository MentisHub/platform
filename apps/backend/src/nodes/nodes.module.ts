import { Module, forwardRef } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/auth.module';
import { DockerModule } from '../docker/docker.module';
import { FlowerModule } from '../flower/flower.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectsModule } from '../projects/projects.module';
import { NodesController } from './controllers/nodes.controller';
import { OrgNodesController } from './controllers/org-nodes.controller';
import { CertificateService } from './services/certificate.service';
import { NodeSignatureService } from './services/signature.service';
import { NodesService } from './services/nodes.service';

@Module({
  imports: [
    PrismaModule,
    AuthorizationModule,
    forwardRef(() => FlowerModule),
    forwardRef(() => ProjectsModule),
    DockerModule,
  ],
  controllers: [OrgNodesController, NodesController],
  providers: [NodesService, CertificateService, NodeSignatureService],
  exports: [NodesService],
})
export class NodesModule {}
