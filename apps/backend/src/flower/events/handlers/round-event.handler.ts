import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma, RoundStatus } from '@prisma/client';
import { RoundService } from '../../../training/services/round.service';
import { FlowerEvents, FlowerRunEventPayload } from '../constants';

@Injectable()
export class RoundEventHandler {
  private readonly logger: Logger = new Logger(RoundEventHandler.name);

  constructor(private readonly roundService: RoundService) {}

  @OnEvent(FlowerEvents.ROUND_STARTED)
  async handleRoundStarted({
    runId,
    event,
  }: FlowerRunEventPayload): Promise<void> {
    const roundNumber = parseInt(event.metadata['round']);
    if (!roundNumber) {
      this.logger.warn(
        {
          action: 'round.started',
          runId,
          issue: 'missing_round_metadata',
        },
        'Round started event missing round metadata',
      );
      return;
    }

    await this.roundService.upsertRound({
      runId,
      number: roundNumber,
      status: RoundStatus.STARTED,
      startedAt: new Date(event.timestamp * 1000),
    });

    this.logger.log(
      {
        action: 'round.started',
        runId,
        roundNumber,
        timestamp: event.timestamp,
      },
      'Round started',
    );
  }

  @OnEvent(FlowerEvents.ROUND_FIT_STARTED)
  async handleRoundFitStarted({ runId }: FlowerRunEventPayload): Promise<void> {
    const round = await this.roundService.getLatestRound(runId);
    if (!round) {
      this.logger.warn(
        {
          action: 'round.fit_started',
          runId,
          issue: 'round_not_found',
        },
        'No round found for fit started event',
      );
      return;
    }

    await this.roundService.updateRound(round.id, {
      status: RoundStatus.FITTING,
    });
  }

  @OnEvent(FlowerEvents.ROUND_FIT_AGGREGATED)
  async handleRoundFitAggregated({
    runId,
    event,
  }: FlowerRunEventPayload): Promise<void> {
    const round = await this.roundService.getLatestRound(runId);
    if (!round) {
      this.logger.warn(
        {
          action: 'round.fit_aggregated',
          runId,
          issue: 'round_not_found',
        },
        'No round found for fit aggregated event',
      );
      return;
    }

    const numResults = parseInt(event.metadata['num_results'] || '0');
    const numFailures = parseInt(event.metadata['num_failures'] || '0');

    await this.roundService.updateRound(round.id, {
      status: RoundStatus.AGGREGATING,
      totalParticipants: numResults + numFailures,
      successfulParticipants: numResults,
    });

    this.logger.debug(
      {
        action: 'round.fit_aggregated',
        runId,
        roundId: round.id,
        roundNumber: round.number,
        numResults,
        numFailures,
        totalParticipants: numResults + numFailures,
      },
      'Round fit phase aggregated',
    );
  }

  @OnEvent(FlowerEvents.ROUND_FIT_FAILED)
  async handleRoundFitFailed({
    runId,
    event,
  }: FlowerRunEventPayload): Promise<void> {
    const round = await this.roundService.getLatestRound(runId);
    if (!round) {
      this.logger.warn(
        {
          action: 'round.fit_failed',
          runId,
          issue: 'round_not_found',
        },
        'No round found for fit failed event',
      );
      return;
    }

    await this.roundService.updateRound(round.id, {
      status: RoundStatus.FIT_FAILED,
      metrics: event.metadata as Prisma.InputJsonValue,
    });

    this.logger.error(
      {
        action: 'round.fit_failed',
        runId,
        roundId: round.id,
        roundNumber: round.number,
        errorType: event.metadata['error_type'],
        errorMessage: event.metadata['error_message'],
      },
      'Round fit phase failed',
    );
  }

  @OnEvent(FlowerEvents.ROUND_EVALUATE_STARTED)
  async handleRoundEvaluateStarted({
    runId,
  }: FlowerRunEventPayload): Promise<void> {
    const round = await this.roundService.getLatestRound(runId);
    if (!round) {
      this.logger.warn(
        {
          action: 'round.evaluate_started',
          runId,
          issue: 'round_not_found',
        },
        'No round found for evaluate started event',
      );
      return;
    }

    await this.roundService.updateRound(round.id, {
      status: RoundStatus.EVALUATING,
    });
  }

  @OnEvent(FlowerEvents.ROUND_EVALUATE_AGGREGATED)
  async handleRoundEvaluateAggregated({
    runId,
    event,
  }: FlowerRunEventPayload): Promise<void> {
    const round = await this.roundService.getLatestRound(runId);
    if (!round) {
      this.logger.warn(
        {
          action: 'round.evaluate_aggregated',
          runId,
          issue: 'round_not_found',
        },
        'No round found for evaluate aggregated event',
      );
      return;
    }

    await this.roundService.updateRound(round.id, {
      status: RoundStatus.EVALUATE_AGGREGATING,
      metrics: event.metadata as Prisma.InputJsonValue,
    });

    this.logger.debug(
      {
        action: 'round.evaluate_aggregated',
        runId,
        roundId: round.id,
        roundNumber: round.number,
        metrics: event.metadata,
      },
      'Round evaluate phase aggregated',
    );
  }

  @OnEvent(FlowerEvents.ROUND_EVALUATE_FAILED)
  async handleRoundEvaluateFailed({
    runId,
    event,
  }: FlowerRunEventPayload): Promise<void> {
    const round = await this.roundService.getLatestRound(runId);
    if (!round) {
      this.logger.warn(
        {
          action: 'round.evaluate_failed',
          runId,
          issue: 'round_not_found',
        },
        'No round found for evaluate failed event',
      );
      return;
    }

    await this.roundService.updateRound(round.id, {
      status: RoundStatus.EVALUATE_FAILED,
    });

    this.logger.error(
      {
        action: 'round.evaluate_failed',
        runId,
        roundId: round.id,
        roundNumber: round.number,
        errorType: event.metadata['error_type'],
        errorMessage: event.metadata['error_message'],
      },
      'Round evaluate phase failed',
    );
  }

  @OnEvent(FlowerEvents.ROUND_COMPLETED)
  async handleRoundCompleted({
    runId,
    event,
  }: FlowerRunEventPayload): Promise<void> {
    const round = await this.roundService.getLatestRound(runId);
    if (!round) {
      this.logger.warn(
        {
          action: 'round.completed',
          runId,
          issue: 'round_not_found',
        },
        'No round found for round completed event',
      );
      return;
    }

    await this.roundService.updateRound(round.id, {
      status: RoundStatus.COMPLETED,
      completedAt: new Date(event.timestamp * 1000),
    });

    this.logger.log(
      {
        action: 'round.completed',
        runId,
        roundId: round.id,
        roundNumber: round.number,
      },
      'Round completed',
    );
  }

  @OnEvent(FlowerEvents.ROUND_FAILED)
  async handleRoundFailed({
    runId,
    event,
  }: FlowerRunEventPayload): Promise<void> {
    const round = await this.roundService.getLatestRound(runId);
    if (!round) {
      this.logger.warn(
        {
          action: 'round.failed',
          runId,
          issue: 'round_not_found',
        },
        'No round found for round failed event',
      );
      return;
    }

    await this.roundService.updateRound(round.id, {
      status: RoundStatus.FAILED,
      completedAt: new Date(event.timestamp * 1000),
    });

    this.logger.error(
      {
        action: 'round.failed',
        runId,
        roundId: round.id,
        roundNumber: round.number,
        errorType: event.metadata['error_type'],
        errorMessage: event.metadata['error_message'],
      },
      'Round failed',
    );
  }
}
