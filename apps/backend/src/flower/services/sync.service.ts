import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Event, EventType } from '@platform/proto';
import { Prisma } from '@prisma/client';
import { TrainingService } from 'src/training/services/training.service';
import { NodesService } from '../../nodes/services/nodes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RoundParticipantService } from '../../training/services/round-participant.service';
import { RoundService } from '../../training/services/round.service';
import { FlowerService } from './flower.service';

@Injectable()
export class FlowerSyncService implements OnModuleInit {
  private readonly logger = new Logger(FlowerSyncService.name);
  private isStreamActive = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly flowerService: FlowerService,
    private readonly roundService: RoundService,
    private readonly roundParticipantService: RoundParticipantService,
    private readonly nodesService: NodesService,
    private readonly trainingService: TrainingService,
  ) {}

  onModuleInit() {
    this.startGlobalEventStream();
  }

  private startGlobalEventStream() {
    if (this.isStreamActive) {
      this.logger.warn('Global event stream is already active');
      return;
    }

    this.logger.log('Starting global event stream for all training runs');
    this.isStreamActive = true;

    const stream = this.flowerService.streamEvents();

    stream.on(
      'data',
      (response: { events: Event[]; latestTimestamp: number }) => {
        if (response.events && response.events.length > 0) {
          for (const event of response.events) {
            void this.handleEvent(event);
          }
        }
      },
    );

    stream.on('end', () => {
      this.logger.warn('Global event stream ended unexpectedly');
      this.isStreamActive = false;
      // Restart after delay
      setTimeout(() => this.startGlobalEventStream(), 5000);
    });

    stream.on('error', (error: Error & { code?: number }) => {
      // UNKNOWN (code 2) errors are common when there are no active runs
      if (error.code === 2) {
        this.logger.debug('No active runs to stream events from');
      } else {
        this.logger.error('Global event stream error:', error.message);
      }
      this.isStreamActive = false;
      // Restart after delay
      setTimeout(() => this.startGlobalEventStream(), 10000);
    });
  }

  private async handleEvent(event: Event): Promise<void> {
    try {
      // Handle node lifecycle events (not tied to a specific run)
      if (
        event.eventType === EventType.NODE_CONNECTED ||
        event.eventType === EventType.NODE_DISCONNECTED
      ) {
        await this.handleNodeLifecycleEvent(event);
        return;
      }

      const mentisRunId = await this.trainingService.getRunByFlowerId(
        event.runId!,
      );
      if (!mentisRunId) {
        return; // Run not from MentisHub
      }

      this.logger.debug(
        `Processing event ${EventType[event.eventType]} for run ${mentisRunId.id}`,
      );

      switch (event.eventType) {
        // Run lifecycle events
        case EventType.RUN_STARTED:
          await this.handleRunStarted(mentisRunId.id, event);
          break;

        case EventType.RUN_COMPLETED:
          await this.handleRunCompleted(mentisRunId.id, event);
          break;

        case EventType.RUN_FAILED:
          await this.handleRunFailed(mentisRunId.id, event);
          break;

        // Round lifecycle events
        case EventType.ROUND_STARTED:
          await this.handleRoundStarted(mentisRunId.id, event);
          break;

        case EventType.ROUND_FIT_STARTED:
          this.logger.debug(
            `Round ${event.metadata['round']} fit phase started`,
          );
          break;

        case EventType.ROUND_FIT_AGGREGATED:
          await this.handleRoundFitAggregated(mentisRunId.id, event);
          break;

        case EventType.ROUND_FIT_FAILED:
          await this.handleRoundFitFailed(mentisRunId.id, event);
          break;

        case EventType.ROUND_EVALUATE_STARTED:
          this.logger.debug(
            `Round ${event.metadata['round']} evaluate phase started`,
          );
          break;

        case EventType.ROUND_EVALUATE_AGGREGATED:
          await this.handleRoundEvaluateAggregated(mentisRunId.id, event);
          break;

        case EventType.ROUND_EVALUATE_FAILED:
          await this.handleRoundEvaluateFailed(mentisRunId.id, event);
          break;

        case EventType.ROUND_COMPLETED:
          await this.handleRoundCompleted(mentisRunId.id);
          break;

        case EventType.ROUND_FAILED:
          await this.handleRoundFailed(mentisRunId.id, event);
          break;

        // Node task events
        case EventType.NODE_FIT_STARTED:
          await this.handleNodeFitStarted(mentisRunId.id, event);
          break;

        case EventType.NODE_FIT_COMPLETED:
          await this.handleNodeFitCompleted(mentisRunId.id, event);
          break;

        case EventType.NODE_FIT_FAILED:
          await this.handleNodeFitFailed(mentisRunId.id, event);
          break;

        case EventType.NODE_EVALUATE_STARTED:
          await this.handleNodeEvaluateStarted(mentisRunId.id, event);
          break;

        case EventType.NODE_EVALUATE_COMPLETED:
          await this.handleNodeEvaluateCompleted(mentisRunId.id, event);
          break;

        case EventType.NODE_EVALUATE_FAILED:
          await this.handleNodeEvaluateFailed(mentisRunId.id, event);
          break;

        default:
          // Ignore other events
          break;
      }
    } catch (error) {
      this.logger.error(`Error handling event:`, error);
    }
  }

  private async handleRunStarted(
    mentisRunId: string,
    event: Event,
  ): Promise<void> {
    await this.prisma.trainingRun.update({
      where: { id: mentisRunId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(event.timestamp * 1000),
      },
    });

    this.logger.log(
      `Training run ${mentisRunId} started with ${event.metadata['num_rounds'] || 'unknown'} rounds`,
    );
  }

  private async handleRoundStarted(
    mentisRunId: string,
    event: Event,
  ): Promise<void> {
    const roundNumber = parseInt(event.metadata['round'] || '0');
    if (roundNumber === 0) {
      this.logger.warn('Round started event missing round metadata');
      return;
    }

    await this.roundService.upsertRound({
      runId: mentisRunId,
      number: roundNumber,
      startedAt: new Date(event.timestamp * 1000),
    });

    this.logger.log(`Round ${roundNumber} started for run ${mentisRunId}`);
  }

  private async handleNodeFitStarted(
    mentisRunId: string,
    event: Event,
  ): Promise<void> {
    this.logger.debug(
      `Handling NODE_FIT_STARTED for node ${event.nodeId} in run ${mentisRunId}`,
    );

    const mentisNodeId = await this.nodesService.findByFlowerNodeId(
      event.nodeId,
    );
    if (!mentisNodeId) {
      this.logger.warn(
        `Node with Flower ID ${event.nodeId} not found in MentisHub`,
      );
      return;
    }

    const round = await this.roundService.getLatestRound(mentisRunId);
    if (!round) {
      this.logger.warn(
        `No round found for node fit started event in run ${mentisRunId}`,
      );
      return;
    }

    // Mark node as ACTIVE when it starts participating in training
    if (mentisNodeId.status === 'READY') {
      await this.prisma.node.update({
        where: { id: mentisNodeId.id },
        data: { status: 'ACTIVE' },
      });
    }

    await this.roundParticipantService.upsertParticipant({
      roundId: round.id,
      nodeId: mentisNodeId.id,
      startedAt: new Date(event.timestamp * 1000),
      metrics: {},
    });

    this.logger.log(
      `Node ${mentisNodeId.name} started fit for round ${event.metadata['round']}`,
    );
  }

  private async handleNodeFitCompleted(
    mentisRunId: string,
    event: Event,
  ): Promise<void> {
    const mentisNodeId = await this.nodesService.findByFlowerNodeId(
      event.nodeId,
    );
    if (!mentisNodeId) {
      return;
    }

    const round = await this.roundService.getLatestRound(mentisRunId);
    if (!round) {
      this.logger.warn(
        `No round found for node fit completed event in run ${mentisRunId}`,
      );
      return;
    }

    await this.roundParticipantService.upsertParticipant({
      roundId: round.id,
      nodeId: mentisNodeId.id,
      completedAt: new Date(event.timestamp * 1000),
      metrics: event.metadata,
    });
  }

  private async handleNodeEvaluateStarted(
    mentisRunId: string,
    event: Event,
  ): Promise<void> {
    const mentisNodeId = await this.nodesService.findByFlowerNodeId(
      event.nodeId,
    );
    if (!mentisNodeId) {
      return;
    }

    const round = await this.roundService.getLatestRound(mentisRunId);
    if (!round) {
      this.logger.warn(
        `No round found for node evaluate started event in run ${mentisRunId}`,
      );
      return;
    }

    this.logger.debug(
      `Node ${mentisNodeId.name} started evaluate for round ${event.metadata['round_number']}`,
    );
  }

  private async handleNodeEvaluateCompleted(
    mentisRunId: string,
    event: Event,
  ): Promise<void> {
    const mentisNodeId = await this.nodesService.findByFlowerNodeId(
      event.nodeId,
    );
    if (!mentisNodeId) {
      return;
    }

    const round = await this.roundService.getLatestRound(mentisRunId);
    if (!round) {
      this.logger.warn(
        `No round found for node evaluate completed event in run ${mentisRunId}`,
      );
      return;
    }

    await this.roundParticipantService.upsertParticipant({
      roundId: round.id,
      nodeId: mentisNodeId.id,
      completedAt: new Date(event.timestamp * 1000),
      metrics: event.metadata,
    });
  }

  private async handleNodeFitFailed(
    mentisRunId: string,
    event: Event,
  ): Promise<void> {
    const mentisNodeId = await this.nodesService.findByFlowerNodeId(
      event.nodeId,
    );
    if (!mentisNodeId) {
      return;
    }

    const round = await this.roundService.getLatestRound(mentisRunId);
    if (!round) {
      this.logger.warn(
        `No round found for node fit failed event in run ${mentisRunId}`,
      );
      return;
    }

    const failureReason =
      event.metadata['status_message'] ||
      event.metadata['error'] ||
      'Unknown failure';

    await this.roundParticipantService.upsertParticipant({
      roundId: round.id,
      nodeId: mentisNodeId.id,
      startedAt: new Date(event.timestamp * 1000),
      completedAt: new Date(event.timestamp * 1000),
      failureReason: failureReason,
      metrics: event.metadata,
    });

    this.logger.warn(
      `Node ${mentisNodeId.id} failed fit in round ${round.number}: ${failureReason}`,
    );
  }

  private async handleNodeEvaluateFailed(
    mentisRunId: string,
    event: Event,
  ): Promise<void> {
    const mentisNodeId = await this.nodesService.findByFlowerNodeId(
      event.nodeId,
    );
    if (!mentisNodeId) {
      return;
    }

    const round = await this.roundService.getLatestRound(mentisRunId);
    if (!round) {
      this.logger.warn(
        `No round found for node evaluate failed event in run ${mentisRunId}`,
      );
      return;
    }

    const failureReason =
      event.metadata['status_message'] ||
      event.metadata['error'] ||
      'Unknown failure';

    await this.roundParticipantService.upsertParticipant({
      roundId: round.id,
      nodeId: mentisNodeId.id,
      startedAt: new Date(event.timestamp * 1000),
      completedAt: new Date(event.timestamp * 1000),
      failureReason: failureReason,
      metrics: event.metadata,
    });

    this.logger.warn(
      `Node ${mentisNodeId.id} failed evaluate in round ${round.number}: ${failureReason}`,
    );
  }

  private async handleRoundFitAggregated(
    mentisRunId: string,
    event: Event,
  ): Promise<void> {
    const round = await this.roundService.getLatestRound(mentisRunId);
    if (!round) {
      this.logger.warn(
        `No round found for fit aggregated event in run ${mentisRunId}`,
      );
      return;
    }

    const numResults = parseInt(event.metadata['num_results'] || '0');
    const numFailures = parseInt(event.metadata['num_failures'] || '0');

    await this.roundService.updateParticipants(
      round.id,
      numResults + numFailures,
      numResults,
    );

    this.logger.log(
      `Round ${round.number} fit aggregated: ${numResults} clients, ${numFailures} failures`,
    );
  }

  private async handleRoundFitFailed(
    mentisRunId: string,
    event: Event,
  ): Promise<void> {
    const round = await this.roundService.getLatestRound(mentisRunId);
    if (!round) {
      this.logger.warn(
        `No round found for fit failed event in run ${mentisRunId}`,
      );
      return;
    }

    const errorType = event.metadata['error_type'] || 'Unknown';
    const errorMessage = event.metadata['error_message'] || 'Fit phase failed';

    this.logger.error(
      `Round ${round.number} fit phase failed: ${errorType} - ${errorMessage}`,
    );
  }

  private async handleRoundEvaluateAggregated(
    mentisRunId: string,
    event: Event,
  ): Promise<void> {
    const round = await this.roundService.getLatestRound(mentisRunId);
    if (!round) {
      this.logger.warn(
        `No round found for evaluate aggregated event in run ${mentisRunId}`,
      );
      return;
    }

    await this.roundService.updateAggregatedMetrics(round.id, event.metadata);

    this.logger.log(
      `Round ${round.number} evaluate aggregated with metrics:`,
      event.metadata,
    );
  }

  private async handleRoundEvaluateFailed(
    mentisRunId: string,
    event: Event,
  ): Promise<void> {
    const round = await this.roundService.getLatestRound(mentisRunId);
    if (!round) {
      this.logger.warn(
        `No round found for evaluate failed event in run ${mentisRunId}`,
      );
      return;
    }

    const errorType = event.metadata['error_type'] || 'Unknown';
    const errorMessage =
      event.metadata['error_message'] || 'Evaluate phase failed';

    this.logger.error(
      `Round ${round.number} evaluate phase failed: ${errorType} - ${errorMessage}`,
    );
  }

  private async handleRoundCompleted(mentisRunId: string): Promise<void> {
    const round = await this.roundService.getLatestRound(mentisRunId);
    if (!round) {
      this.logger.warn(
        `No round found for round completed event in run ${mentisRunId}`,
      );
      return;
    }

    await this.roundService.completeRound(round.id);

    this.logger.log(`Round ${round.number} completed`);
  }

  private async handleRoundFailed(
    mentisRunId: string,
    event: Event,
  ): Promise<void> {
    const round = await this.roundService.getLatestRound(mentisRunId);
    if (!round) {
      this.logger.warn(
        `No round found for round failed event in run ${mentisRunId}`,
      );
      return;
    }

    const errorType = event.metadata['error_type'] || 'Unknown';
    const errorMessage = event.metadata['error_message'] || 'Round failed';

    // Mark round as failed
    await this.roundService.completeRound(round.id);

    this.logger.error(
      `Round ${round.number} failed: ${errorType} - ${errorMessage}`,
    );
  }

  private async handleRunCompleted(
    mentisRunId: string,
    event: Event,
  ): Promise<void> {
    const finalRound = await this.roundService.getLatestRound(mentisRunId);

    const completedAt = new Date(event.timestamp * 1000);

    await this.prisma.trainingRun.update({
      where: { id: mentisRunId },
      data: {
        status: 'COMPLETED',
        completedAt,
        metrics: finalRound?.metrics ? finalRound.metrics : Prisma.JsonNull,
      },
    });

    await this.prisma.runParticipant.updateMany({
      where: { runId: mentisRunId, endedAt: null },
      data: { endedAt: completedAt },
    });

    // Mark all ACTIVE nodes from this run back to READY
    const participants = await this.prisma.runParticipant.findMany({
      where: { runId: mentisRunId },
      include: { node: { select: { id: true, status: true } } },
    });

    await Promise.all(
      participants.map(async (participant) => {
        if (participant.node.status === 'ACTIVE') {
          await this.prisma.node.update({
            where: { id: participant.node.id },
            data: { status: 'READY' },
          });
        }
      }),
    );

    this.logger.log(`Training run ${mentisRunId} completed`);
  }

  private async handleRunFailed(
    mentisRunId: string,
    event: Event,
  ): Promise<void> {
    const completedAt = new Date(event.timestamp * 1000);

    await this.prisma.trainingRun.update({
      where: { id: mentisRunId },
      data: {
        status: 'FAILED',
        completedAt,
      },
    });

    await this.prisma.runParticipant.updateMany({
      where: { runId: mentisRunId, endedAt: null },
      data: { endedAt: completedAt },
    });

    // Mark all ACTIVE nodes from this run back to READY
    const participants = await this.prisma.runParticipant.findMany({
      where: { runId: mentisRunId },
      include: { node: { select: { id: true, status: true } } },
    });

    await Promise.all(
      participants.map(async (participant) => {
        if (participant.node.status === 'ACTIVE') {
          await this.prisma.node.update({
            where: { id: participant.node.id },
            data: { status: 'READY' },
          });
        }
      }),
    );

    this.logger.log(
      `Training run ${mentisRunId} failed: ${event.metadata['error'] || 'Unknown error'}`,
    );
  }

  private async handleNodeLifecycleEvent(event: Event): Promise<void> {
    const mentisNode = await this.nodesService.findByFlowerNodeId(event.nodeId);
    if (!mentisNode) {
      return;
    }

    const isConnected = event.eventType === EventType.NODE_CONNECTED;

    if (isConnected) {
      // When node connects to Flower, just update lastActiveAt
      // Status transitions are handled by:
      // - CREATED -> INITIALIZING: set in activate() when node bootstraps
      // - INITIALIZING -> READY: set in markNodeReady() when FAB is installed
      // - READY -> ACTIVE: set when node starts participating in a run
      await this.prisma.node.update({
        where: { id: mentisNode.id },
        data: {
          lastActiveAt: new Date(event.timestamp * 1000),
        },
      });

      this.logger.log(`Node ${mentisNode.name} connected to Flower SuperLink`);
    } else {
      // When node disconnects, mark as OFFLINE
      await this.prisma.node.update({
        where: { id: mentisNode.id },
        data: {
          status: 'OFFLINE',
          lastActiveAt: new Date(event.timestamp * 1000),
        },
      });

      this.logger.log(
        `Node ${mentisNode.name} disconnected from Flower SuperLink`,
      );
    }
  }
}
