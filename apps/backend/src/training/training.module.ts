import { Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DockerModule } from '../docker/docker.module';
import { FabsModule } from '../fabs/fabs.module';
import { FlowerModule } from '../flower/flower.module';
import { NodesModule } from '../nodes/nodes.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectsModule } from '../projects/projects.module';
import { RoundParticipantService } from './services/round-participant.service';
import { RoundService } from './services/round.service';
import { TrainingService } from './services/training.service';
import { ProjTrainingController } from './training.controller';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    PrismaModule,
    DockerModule,
    forwardRef(() => FlowerModule),
    forwardRef(() => FabsModule),
    ProjectsModule,
    forwardRef(() => NodesModule),
  ],
  controllers: [ProjTrainingController],
  providers: [
    TrainingService,
    RoundService,
    RoundParticipantService,
  ],
  exports: [
    TrainingService,
    RoundService,
    RoundParticipantService,
  ],
})
export class TrainingModule {}
