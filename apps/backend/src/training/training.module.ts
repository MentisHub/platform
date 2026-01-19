import { Module } from '@nestjs/common';
import { DockerModule } from '../docker/docker.module';
import { FabsModule } from '../fabs/fabs.module';
import { FlowerModule } from '../flower/flower.module';
import { NodesModule } from '../nodes/nodes.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectsModule } from '../projects/projects.module';
import { VaultModule } from '../vault/vault.module';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';

@Module({
  imports: [
    PrismaModule,
    VaultModule,
    DockerModule,
    FlowerModule,
    FabsModule,
    ProjectsModule,
    NodesModule,
  ],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule {}
