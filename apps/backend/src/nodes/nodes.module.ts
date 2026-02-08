import { Module, forwardRef } from '@nestjs/common';
import { AuthenticationModule } from '../authentication/auth.module';
import { AuthorizationModule } from '../authorization/auth.module';
import { DockerModule } from '../docker/docker.module';
import { FlowerModule } from '../flower/flower.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectsModule } from '../projects/projects.module';
import { TrainingModule } from '../training/training.module';
import { NodesController } from './controllers/nodes.controller';
import { OrgNodesController } from './controllers/org-nodes.controller';
import { NodeRefreshTokenService } from './services/refresh-token.service';
import { NodeSignatureService } from './services/signature.service';
import { NodesService } from './services/nodes.service';

@Module({
  imports: [
    PrismaModule,
    AuthenticationModule,
    AuthorizationModule,
    forwardRef(() => FlowerModule),
    ProjectsModule,
    DockerModule,
    forwardRef(() => TrainingModule),
  ],
  controllers: [OrgNodesController, NodesController],
  providers: [NodesService, NodeRefreshTokenService, NodeSignatureService],
  exports: [NodesService, NodeRefreshTokenService],
})
export class NodesModule {}
