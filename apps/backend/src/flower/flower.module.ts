import { Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NodesModule } from '../nodes/nodes.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TrainingModule } from '../training/training.module';
import { FlowerService } from './services/flower.service';
import { FlowerSyncService } from './services/sync.service';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    PrismaModule,
    forwardRef(() => TrainingModule),
    forwardRef(() => NodesModule),
  ],
  providers: [FlowerService, FlowerSyncService],
  exports: [FlowerService, FlowerSyncService],
})
export class FlowerModule {}
