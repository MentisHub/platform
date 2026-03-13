import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ErrorCode } from '@platform/contracts';
import {
  NodeStatus,
  Prisma,
  TrainingStatus,
  type TrainingRun,
} from '@prisma/client';
import { NodesService } from 'src/nodes/services/nodes.service';
import { DockerService } from '../../docker/docker.service';
import { FabsService } from '../../fabs/fabs.service';
import { FlowerService } from '../../flower/services/flower.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectsService } from '../../projects/projects.service';
import {
  CreateTrainingRunInput,
  DeployServerAppInput,
} from '../training.interface';

@Injectable()
export class TrainingService {
  private readonly logger: Logger = new Logger(TrainingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly flowerService: FlowerService,
    @Inject(forwardRef(() => NodesService))
    private readonly nodesService: NodesService,
    private readonly fabsService: FabsService,
    private readonly projectsService: ProjectsService,
    private readonly dockerService: DockerService,
  ) {}

  async createTrainingRun(input: CreateTrainingRunInput): Promise<TrainingRun> {
    await this.projectsService.getProjectById(input.projectId);
    await this.fabsService.getFab(input.fabId, input.organizationId);

    const trainingRun = await this.prisma.trainingRun.create({
      data: {
        projectId: input.projectId,
        status: TrainingStatus.PENDING,
        fabId: input.fabId,
        createdBy: input.userId,
      },
    });

    return trainingRun;
  }

  async deployServerApp(input: DeployServerAppInput): Promise<TrainingRun> {
    const { organizationId, trainingRunId, userId } = input;
    const trainingRun = await this.getTrainingRun(trainingRunId);

    if (trainingRun.status !== TrainingStatus.PENDING) {
      throw new BadRequestException({
        code: ErrorCode.INVALID_TRAINING_STATUS,
        message: 'Training run must be in PENDING status to deploy ServerApp',
      });
    }

    await this.update(trainingRunId, {
      status: TrainingStatus.DEPLOYING,
    });

    this.logger.log(
      {
        action: 'serverapp.deploy_started',
        runId: trainingRunId,
        projectId: trainingRun.projectId,
      },
      'Starting ServerApp deployment',
    );

    let nodeId: string | null = null;
    let containerName: string | null = null;

    try {
      const { node, psk } = await this.nodesService.create({
        organizationId,
        userId,
        name: `serverapp-${trainingRunId.slice(0, 8)}`,
        projectId: trainingRun.projectId,
      });
      nodeId = node.id;

      await this.update(trainingRunId, {
        serverAppNode: { connect: { id: node.id } },
      });

      containerName = await this.dockerService.startSuperExecContainer(
        trainingRunId,
        psk,
      );

      await this.nodesService.update(node.id, {
        metadata: {
          containerName,
        },
      });

      const updatedTrainingRun = await this.update(trainingRunId, {
        status: TrainingStatus.READY,
      });

      this.logger.log(
        {
          action: 'serverapp.deployed',
          runId: trainingRunId,
          nodeId: node.id,
          containerName,
        },
        'ServerApp deployed successfully',
      );

      return updatedTrainingRun;
    } catch (error) {
      this.logger.error(
        {
          action: 'serverapp.deploy',
          runId: trainingRunId,
          nodeId,
          containerName,
          err: error instanceof Error ? error : new Error(String(error)),
        },
        'ServerApp deployment failed, initiating rollback',
      );

      if (containerName) {
        try {
          await this.dockerService.stopSuperExecContainer(containerName);
          this.logger.debug(
            {
              action: 'serverapp.rollback',
              runId: trainingRunId,
              containerName,
              step: 'container_stopped',
            },
            'Container stopped during rollback',
          );
        } catch (stopError) {
          this.logger.error(
            {
              action: 'serverapp.rollback',
              runId: trainingRunId,
              containerName,
              step: 'container_stop_failed',
              err:
                stopError instanceof Error
                  ? stopError
                  : new Error(String(stopError)),
              issue: 'rollback_container_stop_failed',
            },
            'Failed to stop container during rollback',
          );
        }
      }

      if (nodeId) {
        try {
          await this.nodesService.remove(nodeId);
          this.logger.debug(
            {
              action: 'serverapp.rollback',
              runId: trainingRunId,
              nodeId,
              step: 'node_deleted',
            },
            'Node deleted during rollback',
          );
        } catch (deleteError) {
          this.logger.error(
            {
              action: 'serverapp.rollback',
              runId: trainingRunId,
              nodeId,
              step: 'node_delete_failed',
              err:
                deleteError instanceof Error
                  ? deleteError
                  : new Error(String(deleteError)),
              issue: 'rollback_node_delete_failed',
            },
            'Failed to delete node during rollback',
          );
        }
      }

      try {
        await this.update(trainingRunId, {
          status: TrainingStatus.PENDING,
          serverAppNode: { disconnect: true },
        });
        this.logger.debug(
          {
            action: 'serverapp.rollback',
            runId: trainingRunId,
            step: 'status_reset',
          },
          'Training run status reset to PENDING during rollback',
        );
      } catch (resetError) {
        this.logger.error(
          {
            action: 'serverapp.rollback',
            runId: trainingRunId,
            step: 'status_reset_failed',
            err:
              resetError instanceof Error
                ? resetError
                : new Error(String(resetError)),
            issue: 'rollback_status_reset_failed',
          },
          'Failed to reset training run status during rollback',
        );
      }

      throw error;
    }
  }

  async runTraining(trainingRunId: string): Promise<TrainingRun> {
    const trainingRun = await this.getTrainingRun(trainingRunId);

    if (trainingRun.status !== TrainingStatus.READY) {
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

    const [projectNodes, fab, project] = await Promise.all([
      this.nodesService.getNodesByProject(trainingRun.projectId),
      this.fabsService.getFabById(trainingRun.fabId),
      this.projectsService.getProjectById(trainingRun.projectId),
    ]);

    const participantNodes = projectNodes.filter(
      (node) =>
        !(node.metadata as Record<string, unknown> | null)?.containerName,
    );

    const trainingNodes = participantNodes.filter(
      (node) => node.status === NodeStatus.TRAINING,
    );

    if (trainingNodes.length > 0) {
      throw new BadRequestException({
        code: ErrorCode.NODES_ALREADY_ACTIVE,
        message: `${trainingNodes.length} node(s) already participating in active training. Complete or stop current training first.`,
      });
    }

    const readyNodes = participantNodes.filter(
      (node) => node.status === NodeStatus.READY,
    );

    const config = (trainingRun.configuration ??
      project.trainingConfig ??
      {}) as Prisma.JsonObject;

    const minAvailableClients =
      typeof config['min_available_clients'] === 'number'
        ? config['min_available_clients']
        : 1;

    if (readyNodes.length < minAvailableClients) {
      throw new BadRequestException({
        code: ErrorCode.NODES_NOT_READY,
        message: `Not enough ready nodes: ${readyNodes.length} ready, ${minAvailableClients} required (min_available_clients).`,
      });
    }

    await this.flowerService.ensureFederationExists(project.id, project.name);

    const fabContent = await this.fabsService.downloadFabById(fab.id);

    const flowerRunId = await this.flowerService.startRun({
      fabHash: fab.fabHash,
      fabContent,
      overrideConfig: config ?? undefined,
      federation: project.id,
    });

    await Promise.all(
      readyNodes.map((node) =>
        this.nodesService.update(node.id, { status: NodeStatus.TRAINING }),
      ),
    );

    this.logger.log(
      {
        action: 'run.started',
        runId: trainingRunId,
        flowerRunId,
        projectId: project.id,
        fabId: fab.id,
        nodeCount: readyNodes.length,
        nodeIds: readyNodes.map((node) => node.id),
      },
      'Training started, nodes marked as TRAINING',
    );

    const updatedTrainingRun = await this.update(trainingRunId, {
      status: TrainingStatus.RUNNING,
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

  async completeRun(runId: string, completedAt: Date): Promise<TrainingRun> {
    const existing = await this.prisma.trainingRun.findUnique({
      where: { id: runId },
    });
    if (!existing || existing.status !== TrainingStatus.RUNNING) {
      return existing as TrainingRun;
    }

    const latestRound = await this.prisma.round.findFirst({
      where: { runId },
      orderBy: { number: 'desc' },
    });

    return this.prisma.trainingRun.update({
      where: { id: runId },
      data: {
        status: TrainingStatus.COMPLETED,
        completedAt,
        metrics: latestRound?.metrics ?? Prisma.JsonNull,
      },
    });
  }

  async failRun(runId: string, completedAt: Date): Promise<TrainingRun> {
    const existing = await this.prisma.trainingRun.findUnique({
      where: { id: runId },
    });
    if (!existing || existing.status !== TrainingStatus.RUNNING) {
      return existing as TrainingRun;
    }

    return this.prisma.trainingRun.update({
      where: { id: runId },
      data: {
        status: TrainingStatus.FAILED,
        completedAt,
      },
    });
  }
}
