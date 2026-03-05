import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NodeStatus } from '@prisma/client';
import { NodesService } from 'src/nodes/services/nodes.service';
import { RoundParticipantService } from '../../../training/services/round-participant.service';
import { RoundService } from '../../../training/services/round.service';
import { FlowerEvents, FlowerRunEventPayload } from '../constants';

@Injectable()
export class EvaluateEventHandler {
  private readonly logger: Logger = new Logger(EvaluateEventHandler.name);

  constructor(
    private readonly nodeService: NodesService,
    private readonly roundService: RoundService,
    private readonly roundParticipantService: RoundParticipantService,
  ) {}

  @OnEvent(FlowerEvents.NODE_EVALUATE_STARTED)
  async handleNodeEvaluateStarted({
    runId,
    event,
  }: FlowerRunEventPayload): Promise<void> {
    const node = await this.nodeService.findByFlowerNodeId(event.nodeId);
    if (!node) {
      return;
    }

    const round = await this.roundService.getLatestRound(runId);
    if (!round) {
      this.logger.warn(
        {
          action: 'node.evaluate_started',
          runId,
          nodeId: node.id,
          flowerNodeId: event.nodeId,
          issue: 'round_not_found',
        },
        'No round found for node evaluate started event',
      );
      return;
    }

    await this.roundParticipantService.upsert({
      roundId: round.id,
      nodeId: node.id,
      startedAt: new Date(event.timestamp * 1000),
      metrics: {},
    });
  }

  @OnEvent(FlowerEvents.NODE_EVALUATE_COMPLETED)
  async handleNodeEvaluateCompleted({
    runId,
    event,
  }: FlowerRunEventPayload): Promise<void> {
    const node = await this.nodeService.findByFlowerNodeId(event.nodeId);
    if (!node) {
      return;
    }

    const round = await this.roundService.getLatestRound(runId);
    if (!round) {
      this.logger.warn(
        {
          action: 'node.evaluate_completed',
          runId,
          nodeId: node.id,
          flowerNodeId: event.nodeId,
          issue: 'round_not_found',
        },
        'No round found for node evaluate completed event',
      );
      return;
    }

    await Promise.all([
      this.roundParticipantService.upsert({
        roundId: round.id,
        nodeId: node.id,
        completedAt: new Date(event.timestamp * 1000),
        metrics: event.metadata,
      }),
      this.nodeService.update(node.id, { status: NodeStatus.READY }),
    ]);
  }

  @OnEvent(FlowerEvents.NODE_EVALUATE_FAILED)
  async handleNodeEvaluateFailed({
    runId,
    event,
  }: FlowerRunEventPayload): Promise<void> {
    const node = await this.nodeService.findByFlowerNodeId(event.nodeId);
    if (!node) {
      return;
    }

    const round = await this.roundService.getLatestRound(runId);
    if (!round) {
      this.logger.warn(
        {
          action: 'node.evaluate_failed',
          runId,
          nodeId: node.id,
          flowerNodeId: event.nodeId,
          issue: 'round_not_found',
        },
        'No round found for node evaluate failed event',
      );
      return;
    }

    await Promise.all([
      this.roundParticipantService.upsert({
        roundId: round.id,
        nodeId: node.id,
        completedAt: new Date(event.timestamp * 1000),
        failureReason: event.metadata['error_message'],
        metrics: event.metadata,
      }),
      this.nodeService.update(node.id, { status: NodeStatus.READY }),
    ]);

    this.logger.warn(
      {
        action: 'node.evaluate_failed',
        runId,
        roundId: round.id,
        roundNumber: round.number,
        nodeId: node.id,
        flowerNodeId: event.nodeId,
        failureReason: event.metadata['error_message'],
      },
      'Node failed evaluate phase',
    );
  }
}
