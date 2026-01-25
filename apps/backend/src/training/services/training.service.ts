import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '@platform/contracts';
import type { Prisma, TrainingRun } from '@prisma/client';
import { NodesService } from 'src/nodes/services/nodes.service';
import { uuidToBase32 } from 'src/utils';
import { DockerService } from '../../docker/docker.service';
import { FabsService } from '../../fabs/fabs.service';
import { FlowerService } from '../../flower/flower.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectsService } from '../../projects/projects.service';
import { RunParticipantService } from './run-participant.service';

@Injectable()
export class TrainingService {
  private readonly logger = new Logger(TrainingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly flowerService: FlowerService,
    @Inject(forwardRef(() => NodesService))
    private readonly nodesService: NodesService,
    private readonly fabsService: FabsService,
    private readonly projectsService: ProjectsService,
    private readonly dockerService: DockerService,
    private readonly configService: ConfigService,
    private readonly runParticipantService: RunParticipantService,
  ) {}

  async createTrainingRun(
    organizationId: string,
    projectId: string,
    userId: string,
    fabId: string,
  ): Promise<TrainingRun> {
    await this.projectsService.getProjectWithCA(projectId, organizationId);
    await this.fabsService.getFab(fabId, organizationId);

    return this.prisma.trainingRun.create({
      data: {
        projectId,
        status: 'PENDING',
        fabId,
        createdById: userId,
      },
    });
  }

  async deployServerApp(
    organizationId: string,
    projectId: string,
    trainingRunId: string,
    userId: string,
  ): Promise<TrainingRun> {
    const trainingRun = await this.getTrainingRun(projectId, trainingRunId);

    if (trainingRun.status !== 'PENDING') {
      throw new BadRequestException({
        code: ErrorCode.INVALID_TRAINING_STATUS,
        message: 'Training run must be in PENDING status to deploy ServerApp',
      });
    }

    this.logger.log({
      message: 'Starting ServerApp deployment',
      trainingRunId,
      projectId,
    });

    // Set status to DEPLOYING while infrastructure is being provisioned
    await this.update(projectId, trainingRunId, {
      status: 'DEPLOYING',
    });

    let nodeId: string | null = null;
    let containerName: string | null = null;

    try {
      const { node, psk } = await this.nodesService.create(
        organizationId,
        userId,
        {
          name: `serverapp-${trainingRunId.slice(0, 8)}`,
          projectId,
        },
      );
      nodeId = node.id;

      await this.update(projectId, trainingRunId, {
        serverAppNode: { connect: { id: node.id } },
      });

      await this.runParticipantService.createParticipant(
        node.id,
        trainingRunId,
      );

      const superlinkHost =
        this.configService.getOrThrow<string>('SUPERLINK_HOST');

      containerName = await this.dockerService.startSuperExecContainer(
        trainingRunId,
        psk,
        superlinkHost,
      );

      await this.nodesService.update(organizationId, node.id, {
        metadata: {
          containerName,
        },
      });

      // Set status to READY - ServerApp deployed successfully, ready to start execution
      const updatedTrainingRun = await this.update(projectId, trainingRunId, {
        status: 'READY',
      });

      this.logger.log({
        message: 'ServerApp deployed successfully',
        trainingRunId,
        nodeId: node.id,
        containerName,
      });

      return updatedTrainingRun;
    } catch (error) {
      // Rollback: Clean up all created resources
      this.logger.error({
        message: 'ServerApp deployment failed, rolling back',
        trainingRunId,
        nodeId,
        containerName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Stop and remove container if it was started
      if (containerName) {
        try {
          await this.dockerService.stopSuperExecContainer(containerName);
          this.logger.log({
            message: 'Container stopped during rollback',
            trainingRunId,
            containerName,
          });
        } catch (stopError) {
          this.logger.error({
            message: 'Failed to stop container during rollback',
            containerName,
            error:
              stopError instanceof Error ? stopError.message : 'Unknown error',
          });
        }
      }

      // Remove run participant if created
      if (nodeId) {
        try {
          await this.runParticipantService.removeParticipant(
            nodeId,
            trainingRunId,
          );
          this.logger.log({
            message: 'Run participant removed during rollback',
            trainingRunId,
            nodeId,
          });
        } catch (removeError) {
          this.logger.error({
            message: 'Failed to remove run participant during rollback',
            nodeId,
            error:
              removeError instanceof Error
                ? removeError.message
                : 'Unknown error',
          });
        }

        // Delete the node
        try {
          await this.nodesService.remove(organizationId, nodeId);
          this.logger.log({
            message: 'Node deleted during rollback',
            trainingRunId,
            nodeId,
          });
        } catch (deleteError) {
          this.logger.error({
            message: 'Failed to delete node during rollback',
            nodeId,
            error:
              deleteError instanceof Error
                ? deleteError.message
                : 'Unknown error',
          });
        }
      }

      // Reset training run status to PENDING
      try {
        await this.update(projectId, trainingRunId, {
          status: 'PENDING',
          serverAppNode: { disconnect: true },
        });
        this.logger.log({
          message: 'Training run status reset to PENDING during rollback',
          trainingRunId,
        });
      } catch (resetError) {
        this.logger.error({
          message: 'Failed to reset training run status during rollback',
          trainingRunId,
          error:
            resetError instanceof Error ? resetError.message : 'Unknown error',
        });
      }

      throw error;
    }
  }

  async runTraining(
    projectId: string,
    trainingRunId: string,
  ): Promise<TrainingRun> {
    const trainingRun = await this.getTrainingRun(projectId, trainingRunId);

    if (trainingRun.status !== 'READY') {
      throw new BadRequestException({
        code: ErrorCode.INVALID_TRAINING_STATUS,
        message: `Training must be in READY status to run. Current status: ${trainingRun.status}`,
      });
    }

    if (!trainingRun.fabId) {
      throw new BadRequestException({
        code: ErrorCode.FAB_NOT_FOUND,
        message: 'Training run must have a FAB assigned',
      });
    }

    const participants =
      await this.runParticipantService.getParticipantsByRun(trainingRunId);

    const readyNodes = participants.filter(
      (p) => p.node.status === 'READY' || p.node.status === 'ACTIVE',
    );

    if (readyNodes.length === 0) {
      throw new BadRequestException('No ready nodes available for training');
    }

    const fab = await this.fabsService.getFab(
      trainingRun.fabId,
      trainingRun.project.organizationId,
    );

    const config = (trainingRun.configuration ??
      (await this.projectsService.getProjectById(projectId)).trainingConfig ??
      {}) as Prisma.JsonObject;
    const fabContent = await this.fabsService.downloadFabById(fab.id);

    const flowerRunId = await this.flowerService.startRun({
      fabHash: fab.fabHash,
      fabContent,
      overrideConfig: config ?? undefined,
      federation: uuidToBase32(trainingRunId),
    });

    const updatedTrainingRun = await this.update(projectId, trainingRunId, {
      status: 'RUNNING',
      startedAt: new Date(),
      flowerRunId,
    });

    return updatedTrainingRun;
  }

  async getTrainingRun(projectId: string, trainingRunId: string) {
    const trainingRun = await this.prisma.trainingRun.findFirst({
      where: {
        id: trainingRunId,
        project: {
          id: projectId,
        },
      },
      include: {
        fab: true,
        project: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!trainingRun) {
      throw new NotFoundException({
        code: ErrorCode.TRAINING_NOT_FOUND,
        message: 'Training run not found',
      });
    }

    return trainingRun;
  }

  async linkNodeToTraining(
    projectId: string,
    trainingId: string,
    nodesId: string[],
  ) {
    const training = await this.getTrainingRun(projectId, trainingId);

    return await this.runParticipantService.linkNodesToRun(
      trainingId,
      nodesId,
      training.status,
    );
  }

  async unlinkNodeFromTraining(
    projectId: string,
    trainingId: string,
    nodeId: string,
  ): Promise<void> {
    const training = await this.getTrainingRun(projectId, trainingId);

    await this.runParticipantService.unlinkNodeFromRun(
      nodeId,
      trainingId,
      training.status,
      training.serverAppId,
    );

    const node = await this.nodesService.findById(
      training.project.organizationId,
      nodeId,
    );

    if (node.status === 'ACTIVE') {
      await this.nodesService.updateNodeStatus(nodeId, 'READY');
    }
  }

  async update(
    projectId: string,
    trainingRunId: string,
    input: Prisma.TrainingRunUpdateInput,
  ): Promise<TrainingRun> {
    const updateData: Prisma.TrainingRunUpdateInput = {};

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    if (input.startedAt !== undefined) {
      updateData.startedAt = input.startedAt;
    }

    if (input.flowerRunId !== undefined) {
      updateData.flowerRunId = input.flowerRunId;
    }

    if (input.serverAppNode !== undefined) {
      updateData.serverAppNode = input.serverAppNode;
    }

    return this.prisma.trainingRun.update({
      where: { id: trainingRunId, projectId },
      data: updateData,
    });
  }
}
