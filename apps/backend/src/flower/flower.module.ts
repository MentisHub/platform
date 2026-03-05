import { Module, forwardRef } from '@nestjs/common';
import { NodesModule } from '../nodes/nodes.module';
import { TrainingModule } from '../training/training.module';
import { EvaluateEventHandler } from './events/handlers/evaluate-event.handler';
import { FitEventHandler } from './events/handlers/fit-event.handler';
import { NodeLifecycleHandler } from './events/handlers/node-lifecycle.handler';
import { RoundEventHandler } from './events/handlers/round-event.handler';
import { RunEventHandler } from './events/handlers/run-event.handler';
import { FlowerEventStreamService } from './services/event-stream.service';
import { FlowerService } from './services/flower.service';

@Module({
  providers: [FlowerService],
  exports: [FlowerService],
})
export class FlowerModule {}

@Module({
  imports: [
    forwardRef(() => FlowerModule),
    forwardRef(() => TrainingModule),
    forwardRef(() => NodesModule),
  ],
  providers: [
    FlowerEventStreamService,
    RunEventHandler,
    RoundEventHandler,
    FitEventHandler,
    EvaluateEventHandler,
    NodeLifecycleHandler,
  ],
})
export class FlowerSyncModule {}
