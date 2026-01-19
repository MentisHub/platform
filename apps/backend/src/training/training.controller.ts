import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/authentication/decorators/current-user.decorator';
import type { JwtPayload } from 'src/authentication/interfaces/jwt-payload.interface';
import {
  StartTrainingDto,
  StartTrainingResponseDto,
  TrainingRunResponseDto,
} from './training.dto';
import { TrainingService } from './training.service';

@ApiTags('training')
@ApiBearerAuth()
@Controller('organizations/:organizationId/training')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Post('deploy')
  @ApiOperation({
    summary: 'Create new training run and deploy ServerApp',
    description:
      'Creates a new training run and deploys the ServerApp container. The training can be started later with the /run endpoint.',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiCreatedResponse({
    description: 'Training created and ServerApp deployed successfully',
    type: StartTrainingResponseDto,
  })
  async deploy(
    @Param('organizationId') organizationId: string,
    @Body() startTrainingDto: StartTrainingDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<StartTrainingResponseDto> {
    const trainingRun = await this.trainingService.createTrainingRun(
      organizationId,
      startTrainingDto,
    );

    await this.trainingService.deployServerApp(
      organizationId,
      trainingRun.id,
      user.sub,
    );

    const updatedTrainingRun = await this.trainingService.getTrainingRun(
      organizationId,
      trainingRun.id,
    );

    return StartTrainingResponseDto.fromEntity(updatedTrainingRun);
  }

  @Post('runs/:trainingRunId/run')
  @ApiOperation({
    summary: 'Start training execution via Flower Control API',
    description:
      'Starts the training run by calling the Flower Control API. ServerApp must be deployed first.',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'trainingRunId', description: 'Training run ID' })
  @ApiOkResponse({
    description: 'Training execution started',
    type: TrainingRunResponseDto,
  })
  async runTraining(
    @Param('organizationId') organizationId: string,
    @Param('trainingRunId') trainingRunId: string,
  ): Promise<TrainingRunResponseDto> {
    const trainingRun = await this.trainingService.runTraining(
      organizationId,
      trainingRunId,
    );

    return TrainingRunResponseDto.fromEntity(trainingRun);
  }

  @Post('start')
  @ApiOperation({
    summary: 'Create, deploy and start training in one step',
    description:
      'Creates a new training run, deploys ServerApp, and starts training execution immediately.',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiCreatedResponse({
    description: 'Training started successfully',
    type: StartTrainingResponseDto,
  })
  async startTraining(
    @Param('organizationId') organizationId: string,
    @Body() startTrainingDto: StartTrainingDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<StartTrainingResponseDto> {
    const trainingRun = await this.trainingService.startTraining(
      organizationId,
      startTrainingDto,
      user.sub,
    );

    return StartTrainingResponseDto.fromEntity(trainingRun);
  }

  @Get('runs/:trainingRunId')
  @ApiOperation({ summary: 'Get training run by ID' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'trainingRunId', description: 'Training run ID' })
  @ApiOkResponse({
    description: 'Training run found',
    type: TrainingRunResponseDto,
  })
  async getTrainingRun(
    @Param('organizationId') organizationId: string,
    @Param('trainingRunId') trainingRunId: string,
  ): Promise<TrainingRunResponseDto> {
    const trainingRun = await this.trainingService.getTrainingRun(
      organizationId,
      trainingRunId,
    );

    return TrainingRunResponseDto.fromEntity(trainingRun);
  }
}
