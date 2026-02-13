import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FlowerService } from './services/flower.service';
import { FlowerSyncService } from './services/sync.service';
import { TrainingService } from 'src/training/services/training.service';
import { NodesService } from 'src/nodes/services/nodes.service';
import { RoundParticipantService } from 'src/training/services/round-participant.service';
import { RoundService } from 'src/training/services/round.service';

@Module({
  imports: [PrismaModule],
  providers: [FlowerService],
  exports: [FlowerService],
})
export class FlowerModule {}

@Module({
  imports: [
    RoundService,
    RoundParticipantService,
    NodesService,
    TrainingService,
  ],
  providers: [FlowerSyncService],
})
export class FlowerSyncModule {}
