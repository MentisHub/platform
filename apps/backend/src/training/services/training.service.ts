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
import { DockerService } from '../../docker/docker.service';
import { FabsService } from '../../fabs/fabs.service';
import { FlowerService } from '../../flower/services/flower.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectsService } from '../../projects/projects.service';

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
  ) {}

  async createTrainingRun(
    organizationId: string,
    projectId: string,
    userId: string,
    fabId: string,
  ): Promise<TrainingRun> {
    await this.projectsService.getProjectById(projectId);
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
    trainingRunId: string,
    userId: string,
  ): Promise<TrainingRun> {
    const trainingRun = await this.getTrainingRun(trainingRunId);

    if (trainingRun.status !== 'PENDING') {
      throw new BadRequestException({
        code: ErrorCode.INVALID_TRAINING_STATUS,
        message: 'Training run must be in PENDING status to deploy ServerApp',
      });
    }

    await this.update(trainingRunId, {
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
          projectId: trainingRun.projectId,
        },
      );
      nodeId = node.id;

      await this.update(trainingRunId, {
        serverAppNode: { connect: { id: node.id } },
      });

      const superlinkHost =
        this.configService.getOrThrow<string>('SUPERLINK_HOST');

      containerName = await this.dockerService.startSuperExecContainer(
        trainingRunId,
        psk,
        superlinkHost,
      );

      await this.nodesService.update(node.id, {
        metadata: {
          containerName,
        },
      });

      const updatedTrainingRun = await this.update(trainingRunId, {
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
      this.logger.error({
        message: 'ServerApp deployment failed, rolling back',
        trainingRunId,
        nodeId,
        containerName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

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

      if (nodeId) {
        try {
          await this.nodesService.remove(nodeId);
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

      try {
        await this.update(trainingRunId, {
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

  async runTraining(trainingRunId: string): Promise<TrainingRun> {
    const trainingRun = await this.getTrainingRun(trainingRunId);

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

    const projectNodes = await this.nodesService.getNodesByProject(
      trainingRun.projectId,
    );

    const initializingNodes = projectNodes.filter(
      (node) => node.status === 'INITIALIZING',
    );

    if (initializingNodes.length > 0) {
      throw new BadRequestException({
        code: ErrorCode.NODES_NOT_READY,
        message: `${initializingNodes.length} node(s) still initializing. Wait for FAB installation to complete.`,
      });
    }

    const activeNodes = projectNodes.filter((node) => node.status === 'ACTIVE');

    if (activeNodes.length > 0) {
      throw new BadRequestException({
        code: ErrorCode.NODES_ALREADY_ACTIVE,
        message: `${activeNodes.length} node(s) already participating in active training. Complete or stop current training first.`,
      });
    }

    const readyNodes = projectNodes.filter((node) => node.status === 'READY');

    if (readyNodes.length === 0) {
      throw new BadRequestException('No ready nodes available for training');
    }

    const fab = await this.fabsService.getFabById(trainingRun.fabId);
    const project = await this.projectsService.getProjectById(
      trainingRun.projectId,
    );

    await this.flowerService.ensureFederationExists(project.id, project.name);

    const config = (trainingRun.configuration ??
      project.trainingConfig ??
      {}) as Prisma.JsonObject;
    const fabContent = await this.fabsService.downloadFabById(fab.id);

    const flowerRunId = await this.flowerService.startRun({
      fabHash: fab.fabHash,
      fabContent,
      overrideConfig: config ?? undefined,
      federation: project.id,
    });

    await Promise.all(
      readyNodes.map((node) =>
        this.nodesService.updateNodeStatus(node.id, 'ACTIVE'),
      ),
    );

    this.logger.log({
      message: 'Training started, nodes marked as ACTIVE',
      trainingRunId,
      nodeIds: readyNodes.map((node) => node.id),
    });

    const updatedTrainingRun = await this.update(trainingRunId, {
      status: 'RUNNING',
      startedAt: new Date(),
      flowerRunId,
    });

    return updatedTrainingRun;
  }

  async getTrainingRun(trainingRunId: string) {
    const trainingRun = await this.prisma.trainingRun.findUnique({
      where: { id: trainingRunId },
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

  async update(
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
      where: { id: trainingRunId },
      data: updateData,
    });
  }

  async getRunByFlowerId(runId: string) {
    return this.prisma.trainingRun.findFirst({
      where: { flowerRunId: runId },
    });
  }
}
