import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectRole } from '@prisma/client';
import { UserPayload } from 'src/authentication/decorators/user.decorator';
import { UserPayloadData } from 'src/authentication/interfaces/payload.interface';
import { OrgMembership } from 'src/authorization/decorators/membership.decorator';
import { RequireProjectRole } from 'src/authorization/decorators/roles.decorator';
import { OrganizationMembership } from 'src/authorization/interfaces/membership.interface';
import { TrainingService } from './services/training.service';
import {
  CreateTrainingDto,
  StartTrainingResponseDto,
  TrainingRunResponseDto,
} from './training.dto';

@ApiTags('training')
@ApiBearerAuth()
@Controller('projects/:projectId/trainings')
export class ProjTrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get()
  @RequireProjectRole(ProjectRole.MEMBER)
  @ApiOperation({
    summary: 'List training runs',
    description:
      'Returns all training runs for the project in descending order',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID', type: String })
  @ApiResponse({
    status: 200,
    description: 'Training runs returned',
    type: [TrainingRunResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async list(
    @Param('projectId') projectId: string,
  ): Promise<TrainingRunResponseDto[]> {
    const runs = await this.trainingService.listProjectTrainingRuns(projectId);
    return runs.map(TrainingRunResponseDto.fromEntity);
  }

  @Get(':trainingId')
  @RequireProjectRole(ProjectRole.MEMBER)
  @ApiOperation({
    summary: 'Get training run',
    description: 'Returns a single training run by ID',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID', type: String })
  @ApiParam({
    name: 'trainingId',
    description: 'Training run UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Training run returned',
    type: TrainingRunResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Training run not found' })
  async getOne(
    @Param('trainingId') trainingId: string,
  ): Promise<TrainingRunResponseDto> {
    const run = await this.trainingService.getTrainingRun(trainingId);
    return TrainingRunResponseDto.fromEntity(run);
  }

  @Post()
  @RequireProjectRole(ProjectRole.ADMIN)
  @ApiOperation({
    summary: 'Create training run',
    description:
      'Creates a new federated learning training run within a project',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project UUID',
    type: String,
  })
  @ApiResponse({
    status: 201,
    description: 'Training run created successfully',
    type: StartTrainingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data or FAB not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions (requires PROJECT ADMIN role)',
  })
  @ApiResponse({
    status: 404,
    description: 'Project not found',
  })
  async create(
    @Param('projectId') projectId: string,
    @Body() createTrainingDto: CreateTrainingDto,
    @UserPayload() user: UserPayloadData,
    @OrgMembership() orgMembership: OrganizationMembership,
  ) {
    const trainingRun = await this.trainingService.createTrainingRun({
      organizationId: orgMembership.organizationId,
      projectId,
      userId: user.sub,
      fabId: createTrainingDto.fabId,
      configuration: createTrainingDto.configuration,
    });

    return StartTrainingResponseDto.fromEntity(trainingRun);
  }

  @Post(':trainingId/deploy')
  @RequireProjectRole(ProjectRole.ADMIN)
  @ApiOperation({
    summary: 'Deploy ServerApp for training run',
    description:
      'Deploys the server application to the infrastructure for an existing training run',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project UUID',
    type: String,
  })
  @ApiParam({
    name: 'trainingId',
    description: 'Training run UUID',
    type: String,
  })
  @ApiResponse({
    status: 201,
    description: 'ServerApp deployed successfully',
    type: StartTrainingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data or deployment failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions (requires PROJECT ADMIN role)',
  })
  @ApiResponse({
    status: 404,
    description: 'Project or training run not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Server deployment failed',
  })
  async deploy(
    @Param('trainingId') trainingId: string,
    @UserPayload() user: UserPayloadData,
    @OrgMembership() orgMembership: OrganizationMembership,
  ): Promise<StartTrainingResponseDto> {
    const trainingRunUpdated = await this.trainingService.deployServerApp({
      organizationId: orgMembership.organizationId,
      trainingRunId: trainingId,
      userId: user.sub,
    });

    return StartTrainingResponseDto.fromEntity(trainingRunUpdated);
  }

  @Post(':trainingId/run')
  @RequireProjectRole(ProjectRole.ADMIN)
  @ApiOperation({
    summary: 'Start training execution',
    description:
      'Initiates the execution of a training run on all ready nodes in the project',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project UUID',
    type: String,
  })
  @ApiParam({
    name: 'trainingId',
    description: 'Training run UUID',
    type: String,
  })
  @ApiResponse({
    status: 201,
    description: 'Training execution started successfully',
    type: TrainingRunResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Training cannot be started (invalid state or no nodes ready)',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions (requires PROJECT ADMIN role)',
  })
  @ApiResponse({
    status: 404,
    description: 'Project or training run not found',
  })
  async runTraining(
    @Param('trainingId') trainingId: string,
  ): Promise<TrainingRunResponseDto> {
    const trainingRun = await this.trainingService.runTraining(trainingId);

    return TrainingRunResponseDto.fromEntity(trainingRun);
  }
}
