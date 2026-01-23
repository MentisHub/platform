import { Module, forwardRef } from '@nestjs/common';
import { DockerModule } from '../docker/docker.module';
import { FabsModule } from '../fabs/fabs.module';
import { FlowerModule } from '../flower/flower.module';
import { NodesModule } from '../nodes/nodes.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectsModule } from '../projects/projects.module';
import { VaultModule } from '../vault/vault.module';
import { ProjTrainingController } from './controllers/proj-training.controller';
import { TrainingController } from './controllers/training.controller';
import { TrainingService } from './training.service';

@Module({
  imports: [
    PrismaModule,
    VaultModule,
    DockerModule,
    FlowerModule,
    FabsModule,
    ProjectsModule,
    forwardRef(() => NodesModule),
  ],
  controllers: [TrainingController, ProjTrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule {}
