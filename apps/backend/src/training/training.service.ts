import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '@platform/contracts';
import type { TrainingRun } from '@prisma/client';
import { DockerService } from '../docker/docker.service';
import { FabsService } from '../fabs/fabs.service';
import { FlowerService } from '../flower/flower.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { generatePSKWithHash, uuidToBase32 } from '../utils';
import type { StartTrainingDto } from './training.dto';

@Injectable()
export class TrainingService {
  private readonly logger = new Logger(TrainingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly flowerService: FlowerService,
    private readonly fabsService: FabsService,
    private readonly projectsService: ProjectsService,
    private readonly dockerService: DockerService,
    private readonly configService: ConfigService,
  ) {}

  async createTrainingRun(
    organizationId: string,
    input: StartTrainingDto,
  ): Promise<TrainingRun> {
    await this.projectsService.getProjectWithCA(
      input.projectId,
      organizationId,
    );

    await this.fabsService.getFabWithAccessCheck(input.fabId, organizationId);

    const trainingRun = await this.prisma.trainingRun.create({
      data: {
        projectId: input.projectId,
        status: 'PENDING',
        fabId: input.fabId,
      },
    });

    return trainingRun;
  }

  async deployServerApp(
    organizationId: string,
    trainingRunId: string,
    userId: string,
  ): Promise<TrainingRun> {
    const trainingRun = await this.getTrainingRun(
      organizationId,
      trainingRunId,
    );

    if (trainingRun.status !== 'PENDING') {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.INVALID_INPUT,
        message: 'Training run must be in PENDING status to deploy ServerApp',
      });
    }

    // Get project to access organization
    const project = await this.prisma.project.findUnique({
      where: { id: trainingRun.projectId },
      include: { organization: true },
    });

    if (!project) {
      throw new NotFoundException({
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: 'Project not found',
      });
    }

    // Generate PSK for ServerApp node
    const { psk, hash } = generatePSKWithHash();
    const orgIdBase32 = uuidToBase32(project.organizationId);
    const fullPsk = `${orgIdBase32}.${psk}`;

    // Create ServerApp node
    const node = await this.prisma.node.create({
      data: {
        id: hash,
        name: `serverapp-${trainingRunId}`,
        type: 'SERVERAPP',
        status: 'INACTIVE',
        organizationId: project.organizationId,
        projectId: project.id,
        createdById: userId,
        trainingRunId: trainingRun.id,
        metadata: {
          trainingRunId: trainingRun.id,
          fabId: trainingRun.fabId,
        },
      },
    });

    this.logger.log(
      `Created ServerApp node ${node.id} for training run ${trainingRunId}`,
    );

    // Start SuperExec container
    const superlinkHost =
      this.configService.getOrThrow<string>('SUPERLINK_HOST');

    const containerName = await this.dockerService.startSuperExecContainer(
      trainingRunId,
      fullPsk,
      superlinkHost,
    );

    this.logger.log(
      `Started SuperExec container ${containerName} for training run ${trainingRunId}`,
    );

    // Update training run status
    const updatedTrainingRun = await this.prisma.trainingRun.update({
      where: { id: trainingRunId },
      data: {
        status: 'PENDING', // Still pending until training actually starts
      },
    });

    return updatedTrainingRun;
  }

  async runTraining(
    organizationId: string,
    trainingRunId: string,
  ): Promise<TrainingRun> {
    const trainingRun = await this.getTrainingRun(
      organizationId,
      trainingRunId,
    );

    if (trainingRun.status !== 'PENDING') {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.INVALID_INPUT,
        message: 'Training run is not in PENDING status',
      });
    }

    if (!trainingRun.fabId) {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.INVALID_INPUT,
        message: 'FAB ID is required',
      });
    }

    const fab = await this.fabsService.getFabById(trainingRun.fabId);

    this.logger.log(
      `Starting training run ${trainingRunId} via Flower Control API with FAB hash ${fab.fabHash}`,
    );

    // Download FAB content from storage
    const fabContent = await this.fabsService.downloadFabById(fab.id);

    const flowerRunId = await this.flowerService.startRun({
      fabHash: fab.fabHash,
      fabContent,
      overrideConfig: {},
      federation: 'default',
    });

    this.logger.log(
      `Training run ${trainingRunId} started with Flower run ID: ${flowerRunId}`,
    );

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

  async startTraining(
    organizationId: string,
    input: StartTrainingDto,
    userId: string,
  ): Promise<TrainingRun> {
    const trainingRun = await this.createTrainingRun(organizationId, input);
    await this.deployServerApp(organizationId, trainingRun.id, userId);
    await this.runTraining(organizationId, trainingRun.id);

    const updatedTrainingRun = await this.prisma.trainingRun.findUnique({
      where: { id: trainingRun.id },
    });

    return updatedTrainingRun!;
  }

  async getTrainingRun(
    organizationId: string,
    trainingRunId: string,
  ): Promise<TrainingRun> {
    const trainingRun = await this.prisma.trainingRun.findFirst({
      where: {
        id: trainingRunId,
        project: {
          organizationId,
          deletedAt: null,
        },
      },
    });

    if (!trainingRun) {
      throw new NotFoundException({
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: 'Training run not found',
      });
    }

    return trainingRun;
  }
}
