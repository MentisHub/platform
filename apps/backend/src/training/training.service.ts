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
import { DockerService } from '../docker/docker.service';
import { FabsService } from '../fabs/fabs.service';
import { FlowerService } from '../flower/flower.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';

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
    await this.projectsService.getProjectWithCA(projectId, organizationId);
    await this.fabsService.getFab(fabId, organizationId);

    const trainingRun = await this.prisma.trainingRun.create({
      data: {
        projectId,
        status: 'PENDING',
        fabId,
        createdById: userId,
      },
    });

    return trainingRun;
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

    const { node, psk } = await this.nodesService.create(
      organizationId,
      userId,
      {
        name: `serverapp-${trainingRunId.slice(0, 8)}`,
        projectId,
      },
    );

    await this.update(projectId, trainingRunId, {
      serverAppNode: { connect: { id: node.id } },
    });

    await this.prisma.runParticipant.create({
      data: {
        nodeId: node.id,
        runId: trainingRunId,
      },
    });

    const superlinkHost =
      this.configService.getOrThrow<string>('SUPERLINK_HOST');

    const containerName = await this.dockerService.startSuperExecContainer(
      trainingRunId,
      psk,
      superlinkHost,
    );

    const updatedTrainingRun = await this.update(projectId, trainingRunId, {
      status: 'PENDING', // Still pending until training actually starts
    });

    await this.nodesService.update(organizationId, node.id, {
      metadata: {
        containerName,
      },
    });

    return updatedTrainingRun;
  }

  async runTraining(
    projectId: string,
    trainingRunId: string,
  ): Promise<TrainingRun> {
    const trainingRun = await this.getTrainingRun(projectId, trainingRunId);

    if (trainingRun.status !== 'PENDING') {
      throw new BadRequestException({
        code: ErrorCode.INVALID_TRAINING_STATUS,
        message: 'Training must be in PENDING status to run',
      });
    }

    if (!trainingRun.fabId) {
      throw new BadRequestException({
        code: ErrorCode.FAB_NOT_FOUND,
        message: 'Training run must have a FAB assigned',
      });
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
      overrideConfig: (config as Record<string, unknown>) ?? {},
      federation: (config.federation as string | undefined) ?? 'default',
    });

    const updatedTrainingRun = await this.prisma.trainingRun.update({
      where: { id: trainingRunId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
        flowerRunId,
      },
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

    if (training.status !== 'PENDING')
      throw new BadRequestException({
        code: ErrorCode.INVALID_TRAINING_STATUS,
        message: '',
      });

    return await this.prisma.runParticipant.createMany({
      data: nodesId.map((id) => ({
        nodeId: id,
        runId: trainingId,
      })),
      skipDuplicates: true,
    });
  }

  async update(
    projectId: string,
    trainingRunId: string,
    input: Prisma.TrainingRunUpdateInput,
  ) {
    const updateInput: Prisma.TrainingRunUpdateInput = {};

    if (input.status !== undefined) {
      updateInput.status = input.status;

      if (input.status === 'RUNNING') updateInput.startedAt = new Date();
    }

    if (input.flowerRunId !== undefined)
      updateInput.flowerRunId = input.flowerRunId;

    return await this.prisma.trainingRun.update({
      where: { id: trainingRunId, projectId },
      data: updateInput,
    });
  }

  async getActiveTrainingRunForNode(nodeId: string): Promise<string | null> {
    const runParticipant = await this.prisma.runParticipant.findFirst({
      where: {
        nodeId,
        run: {
          status: {
            in: ['PENDING', 'RUNNING'],
          },
        },
      },
      select: {
        runId: true,
      },
    });

    return runParticipant?.runId ?? null;
  }
}
