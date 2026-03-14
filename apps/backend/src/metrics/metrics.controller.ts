import {
  Controller,
  Get,
  MessageEvent,
  Param,
  Query,
  Sse,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ProjectRole } from '@prisma/client';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RequireProjectRole } from 'src/authorization/decorators/roles.decorator';
import {
  MetricsQueryDto,
  MetricsResponseDto,
  MetricsStreamQueryDto,
} from './metrics.dto';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@ApiBearerAuth()
@Controller('projects/:projectId/metrics')
export class ProjMetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @RequireProjectRole(ProjectRole.MEMBER)
  @ApiOperation({
    summary: 'Query project FL metrics',
    description:
      'Returns time series data from Prometheus for all training runs in the project. ' +
      'Any metric emitted by a FAB that includes a `training_run_id` label matching a run ' +
      'in this project is returned — custom metrics are fully supported with no reserved names.',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID', type: String })
  @ApiQuery({
    name: 'start',
    required: false,
    description: 'Start time — ISO8601 or unix seconds (default: 1 hour ago)',
  })
  @ApiQuery({
    name: 'end',
    required: false,
    description: 'End time — ISO8601 or unix seconds (default: now)',
  })
  @ApiQuery({
    name: 'step',
    required: false,
    description:
      'Resolution step as a Prometheus duration string, e.g. "30s", "5m" (default: 1m)',
  })
  @ApiQuery({
    name: 'trainingRunId',
    required: false,
    description: 'Restrict results to a single training run UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics returned successfully',
    type: MetricsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions — requires project membership',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getMetrics(
    @Param('projectId') projectId: string,
    @Query() query: MetricsQueryDto,
  ): Promise<MetricsResponseDto> {
    return this.metricsService.getProjectMetrics(projectId, query);
  }

  @Sse('stream')
  @RequireProjectRole(ProjectRole.MEMBER)
  @ApiOperation({
    summary: 'Stream live FL metrics (SSE)',
    description:
      'Opens a Server-Sent Events connection that emits an instant metric snapshot every 5 s. ' +
      'Each event contains the current value of every series tagged with a training run that ' +
      'belongs to this project. Custom FAB metrics are included automatically.',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID', type: String })
  @ApiQuery({
    name: 'trainingRunId',
    required: false,
    description: 'Restrict the stream to a single training run UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'SSE stream — emits MetricsStreamEvent every 5 s',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions — requires project membership',
  })
  streamMetrics(
    @Param('projectId') projectId: string,
    @Query() query: MetricsStreamQueryDto,
  ): Observable<MessageEvent> {
    return this.metricsService
      .streamProjectMetrics(projectId, query.trainingRunId)
      .pipe(map((data) => ({ data })));
  }
}
