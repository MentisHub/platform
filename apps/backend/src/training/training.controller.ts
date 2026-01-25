import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectRole } from '@prisma/client';
import { CurrentUser } from 'src/authentication/decorators/current-user.decorator';
import type { JwtPayload } from 'src/authentication/interfaces/jwt-payload.interface';
import { OrgMembership } from 'src/authorization/decorators/membership.decorator';
import { RequireProjectRole } from 'src/authorization/decorators/roles.decorator';
import { OrganizationMembership } from 'src/authorization/interfaces/membership.interface';
import {
  CreateTrainingDto,
  LinkNodeToTrainingDto,
  LinkNodeToTrainingResponse,
  StartTrainingResponseDto,
  TrainingRunResponseDto,
} from './training.dto';
import { TrainingService } from './services/training.service';

@ApiTags('training')
@ApiBearerAuth()
@Controller('projects/:projectId/trainings')
export class ProjTrainingController {
  constructor(private readonly trainingService: TrainingService) {}

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
    @CurrentUser() user: JwtPayload,
    @OrgMembership() orgMembership: OrganizationMembership,
  ) {
    const trainingRun = await this.trainingService.createTrainingRun(
      orgMembership.organizationId,
      projectId,
      user.sub,
      createTrainingDto.fabId,
    );

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
    @CurrentUser() user: JwtPayload,
    @OrgMembership() orgMembership: OrganizationMembership,
  ): Promise<StartTrainingResponseDto> {
    const trainingRunUpdated = await this.trainingService.deployServerApp(
      orgMembership.organizationId,
      trainingId,
      user.sub,
    );

    return StartTrainingResponseDto.fromEntity(trainingRunUpdated);
  }

  @Post(':trainingId/run')
  @RequireProjectRole(ProjectRole.ADMIN)
  @ApiOperation({
    summary: 'Start training execution',
    description: 'Initiates the execution of a training run on linked nodes',
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
    description:
      'Training cannot be started (invalid state or no nodes linked)',
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

  @Post(':trainingId/nodes')
  @RequireProjectRole(ProjectRole.ADMIN)
  @ApiOperation({
    summary: 'Link nodes to training',
    description:
      'Associates nodes with a training run to participate in federated learning',
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
    description: 'Nodes linked successfully',
    type: LinkNodeToTrainingResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid node IDs or nodes already linked',
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
    description: 'Project, training run, or nodes not found',
  })
  async linkNodeToTraining(
    @Param('trainingId') trainingId: string,
    @Body() input: LinkNodeToTrainingDto,
  ): Promise<LinkNodeToTrainingResponse> {
    const batch = await this.trainingService.linkNodeToTraining(
      trainingId,
      input.nodesId,
    );

    return {
      count: batch.count,
    };
  }

  @Delete(':trainingId/nodes/:nodeId')
  @RequireProjectRole(ProjectRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Unlink node from training',
    description:
      'Removes a node from a training run. Only allowed when training is PENDING or READY (before execution starts). Cannot remove ServerApp node or nodes that have already participated in rounds.',
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
  @ApiParam({
    name: 'nodeId',
    description: 'Node ID to unlink',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Node unlinked successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid operation (training already running, node is ServerApp, or node participated in rounds)',
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
    description: 'Project, training run, or node not found',
  })
  async unlinkNodeFromTraining(
    @Param('trainingId') trainingId: string,
    @Param('nodeId') nodeId: string,
  ): Promise<void> {
    await this.trainingService.unlinkNodeFromTraining(trainingId, nodeId);
  }
}
