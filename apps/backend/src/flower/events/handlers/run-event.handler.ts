import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TrainingService } from '../../../training/services/training.service';
import { FlowerEvents, FlowerRunEventPayload } from '../constants';

@Injectable()
export class RunEventHandler {
  private readonly logger: Logger = new Logger(RunEventHandler.name);

  constructor(
    @Inject(forwardRef(() => TrainingService))
    private readonly trainingService: TrainingService,
  ) {}

  @OnEvent(FlowerEvents.RUN_STARTED)
  async handleRunStarted({
    runId,
    event,
  }: FlowerRunEventPayload): Promise<void> {
    const numRounds = event.metadata['num_rounds'];

    await this.trainingService.update(runId, {
      startedAt: new Date(event.timestamp * 1000),
    });

    this.logger.log(
      {
        action: 'run.started',
        runId,
        numRounds: numRounds ? parseInt(numRounds) : undefined,
        timestamp: event.timestamp,
      },
      'Training run started',
    );
  }

  @OnEvent(FlowerEvents.RUN_COMPLETED)
  async handleRunCompleted({
    runId,
    event,
  }: FlowerRunEventPayload): Promise<void> {
    const result = await this.trainingService.completeRun(
      runId,
      new Date(event.timestamp * 1000),
    );

    this.logger.log(
      {
        action: 'run.completed',
        runId,
        metrics: result.metrics,
      },
      'Training run completed successfully',
    );
  }

  @OnEvent(FlowerEvents.RUN_FAILED)
  async handleRunFailed({
    runId,
    event,
  }: FlowerRunEventPayload): Promise<void> {
    await this.trainingService.failRun(runId, new Date(event.timestamp * 1000));

    this.logger.error(
      {
        action: 'run.failed',
        runId,
        errorType: event.metadata['error_type'],
        errorMessage: event.metadata['error_message'],
      },
      'Training run failed',
    );
  }
}
