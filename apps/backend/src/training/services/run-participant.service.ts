import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ErrorCode } from '@platform/contracts';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RunParticipantService {
  private readonly logger = new Logger(RunParticipantService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createParticipant(nodeId: string, runId: string) {
    return this.prisma.runParticipant.create({
      data: {
        nodeId,
        runId,
      },
    });
  }

  async linkNodesToRun(
    trainingId: string,
    nodesId: string[],
    trainingStatus: string,
  ) {
    if (trainingStatus !== 'PENDING' && trainingStatus !== 'READY') {
      throw new BadRequestException({
        code: ErrorCode.INVALID_TRAINING_STATUS,
        message: `Cannot link nodes to a training run in ${trainingStatus} status. Training must be PENDING or READY.`,
      });
    }

    return this.prisma.runParticipant.createMany({
      data: nodesId.map((id) => ({
        nodeId: id,
        runId: trainingId,
      })),
      skipDuplicates: true,
    });
  }

  async getActiveTrainingRunForNode(nodeId: string) {
    const runParticipant = await this.prisma.runParticipant.findFirst({
      where: {
        nodeId,
        run: {
          status: {
            in: ['PENDING', 'READY', 'RUNNING'],
          },
        },
      },
      select: {
        runId: true,
        run: {
          select: {
            serverAppId: true,
            fab: {
              select: {
                publisherName: true,
                name: true,
                version: true,
                fabHash: true,
              },
            },
          },
        },
      },
    });

    if (!runParticipant) {
      return null;
    }

    return {
      runId: runParticipant.runId,
      isServerApp: runParticipant.run.serverAppId === nodeId,
      fab: runParticipant.run.fab || undefined,
    };
  }

  async getParticipantsByRun(runId: string) {
    return this.prisma.runParticipant.findMany({
      where: { runId },
      include: {
        node: true,
      },
    });
  }

  async unlinkNodeFromRun(
    nodeId: string,
    trainingId: string,
    trainingStatus: string,
    serverAppId?: string | null,
  ): Promise<void> {
    if (serverAppId && nodeId === serverAppId) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_OPERATION,
        message: 'Cannot remove ServerApp node from training run',
      });
    }

    if (trainingStatus !== 'PENDING' && trainingStatus !== 'READY') {
      throw new BadRequestException({
        code: ErrorCode.INVALID_TRAINING_STATUS,
        message: `Cannot unlink nodes from training in ${trainingStatus} status. Training must be PENDING or READY.`,
      });
    }

    const roundParticipations = await this.prisma.roundParticipant.count({
      where: {
        nodeId,
        round: {
          runId: trainingId,
        },
      },
    });

    if (roundParticipations > 0) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_OPERATION,
        message:
          'Cannot unlink node that has already participated in training rounds',
      });
    }

    await this.removeParticipant(nodeId, trainingId);
  }

  async removeParticipant(nodeId: string, runId: string) {
    return this.prisma.runParticipant.delete({
      where: {
        runId_nodeId: {
          runId,
          nodeId,
        },
      },
    });
  }
}
