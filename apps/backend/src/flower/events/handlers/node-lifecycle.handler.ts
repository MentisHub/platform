import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NodeStatus } from '@prisma/client';
import { NodesService } from 'src/nodes/services/nodes.service';
import { FlowerEvents, FlowerNodeLifecyclePayload } from '../constants';

@Injectable()
export class NodeLifecycleHandler {
  private readonly logger: Logger = new Logger(NodeLifecycleHandler.name);

  constructor(private readonly nodeService: NodesService) {}

  @OnEvent(FlowerEvents.NODE_CONNECTED)
  async handleNodeConnected({
    event,
  }: FlowerNodeLifecyclePayload): Promise<void> {
    const node = await this.nodeService.findByFlowerNodeId(event.nodeId);
    if (!node) {
      this.logger.debug(
        {
          action: 'node.connected',
          flowerNodeId: event.nodeId,
          issue: 'node_not_found',
        },
        'Node lifecycle event for unregistered node',
      );
      return;
    }

    const newStatus =
      node.status !== NodeStatus.ERROR ? NodeStatus.READY : node.status;

    await this.nodeService.update(node.id, {
      status: newStatus,
      lastActiveAt: new Date(event.timestamp * 1000),
    });

    this.logger.log(
      {
        action: 'node.connected',
        nodeId: node.id,
        nodeName: node.name,
        flowerNodeId: event.nodeId,
        previousStatus: node.status,
        newStatus,
        timestamp: event.timestamp,
      },
      'Node connected to Flower SuperLink',
    );
  }

  @OnEvent(FlowerEvents.NODE_DISCONNECTED)
  async handleNodeDisconnected({
    event,
  }: FlowerNodeLifecyclePayload): Promise<void> {
    const node = await this.nodeService.findByFlowerNodeId(event.nodeId);
    if (!node) {
      this.logger.debug(
        {
          action: 'node.disconnected',
          flowerNodeId: event.nodeId,
          issue: 'node_not_found',
        },
        'Node lifecycle event for unregistered node',
      );
      return;
    }

    await this.nodeService.update(node.id, {
      status: NodeStatus.OFFLINE,
      lastActiveAt: new Date(event.timestamp * 1000),
    });

    this.logger.log(
      {
        action: 'node.disconnected',
        nodeId: node.id,
        nodeName: node.name,
        flowerNodeId: event.nodeId,
        previousStatus: node.status,
        timestamp: event.timestamp,
      },
      'Node disconnected from Flower SuperLink',
    );
  }
}
