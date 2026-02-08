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
  ) { }

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
        event.eventType === EventType.EVENT_TYPE_NODE_CONNECTED ||
        event.eventType === EventType.EVENT_TYPE_NODE_DISCONNECTED
      ) {
        await this.handleNodeLifecycleEvent(event);
        return;
      }

      const mentisRunId = await this.trainingService.getRunByFlowerId(
        event.runId,
      );
      if (!mentisRunId) {
        return; // Run not from MentisHub
      }

      this.logger.debug(
        `Processing event ${EventType[event.eventType]} for run ${mentisRunId.id}`,
      );

      switch (event.eventType) {
        case EventType.EVENT_TYPE_ROUND_STARTED:
          await this.handleRoundStarted(mentisRunId.id, event);
          break;

        case EventType.EVENT_TYPE_ROUND_FIT_RECEIVED:
          // First fit response received - just log for now
          this.logger.debug(
            `First fit response received for round ${event.metadata['round_number']}`,
          );
          break;

        case EventType.EVENT_TYPE_NODE_FIT_COMPLETED:
          await this.handleNodeFitCompleted(mentisRunId.id, event);
          break;

        case EventType.EVENT_TYPE_NODE_EVALUATE_COMPLETED:
          await this.handleNodeEvaluateCompleted(mentisRunId.id, event);
          break;

        case EventType.EVENT_TYPE_NODE_FIT_FAILED:
          await this.handleNodeFitFailed(mentisRunId.id, event);
          break;

        case EventType.EVENT_TYPE_NODE_EVALUATE_FAILED:
          await this.handleNodeEvaluateFailed(mentisRunId.id, event);
          break;

        case EventType.EVENT_TYPE_ROUND_FIT_AGGREGATED:
          await this.handleRoundFitAggregated(mentisRunId.id, event);
          break;

        case EventType.EVENT_TYPE_ROUND_EVALUATE_AGGREGATED:
          await this.handleRoundEvaluateAggregated(mentisRunId.id, event);
          break;

        case EventType.EVENT_TYPE_ROUND_COMPLETED:
          await this.handleRoundCompleted(mentisRunId.id, event);
          break;

        case EventType.EVENT_TYPE_RUN_COMPLETED:
          await this.handleRunCompleted(mentisRunId.id, event);
          break;

        case EventType.EVENT_TYPE_RUN_FAILED:
          await this.handleRunFailed(mentisRunId.id, event);
          break;

        default:
          // Ignore other events
          break;
      }
    } catch (error) {
      this.logger.error(`Error handling event:`, error);
    }
  }

  private async handleRoundStarted(
    mentisRunId: string,
    event: Event,
  ): Promise<void> {
    const roundNumber = parseInt(event.metadata['round_number'] || '0');
    if (roundNumber === 0) {
      this.logger.warn('Round started event missing round_number metadata');
      return;
    }

    await this.roundService.upsertRound({
      runId: mentisRunId,
      number: roundNumber,
      startedAt: new Date(event.timestamp * 1000),
    });

    this.logger.log(`Round ${roundNumber} started for run ${mentisRunId}`);
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
      completedAt: new Date(event.timestamp * 1000),
      metrics: event.metadata,
    });
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
      startedAt: new Date(event.timestamp * 1000),
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

    // server.py emits fit_clients/fit_failures, workflows emit num_results/num_failures
    const fitClients = parseInt(
      event.metadata['fit_clients'] || event.metadata['num_results'] || '0',
    );
    const fitFailures = parseInt(
      event.metadata['fit_failures'] || event.metadata['num_failures'] || '0',
    );

    await this.roundService.updateParticipants(
      round.id,
      fitClients + fitFailures,
      fitClients,
    );

    this.logger.log(
      `Round ${round.number} fit aggregated: ${fitClients} clients, ${fitFailures} failures`,
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

  private async handleRoundCompleted(
    mentisRunId: string,
    event: Event,
  ): Promise<void> {
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

    const isConnected = event.eventType === EventType.EVENT_TYPE_NODE_CONNECTED;

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

      this.logger.log(`Node ${mentisNode.name} disconnected from Flower SuperLink`);
    }
  }
}
