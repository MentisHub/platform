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
import { MetricsQueryDto, MetricsResponseDto } from './metrics.dto';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@ApiBearerAuth()
@Controller('projects/:projectId/runs/:runId/metrics')
export class ProjMetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @RequireProjectRole(ProjectRole.MEMBER)
  @ApiOperation({
    summary: 'Query FL metrics for a training run',
    description:
      'Returns time series data from Prometheus for a specific training run. ' +
      "The time range is derived from the run's startedAt and completedAt timestamps. " +
      'Any metric emitted by the FAB with a matching run_id label is returned — custom metrics are fully supported.',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID', type: String })
  @ApiParam({ name: 'runId', description: 'Training run UUID', type: String })
  @ApiQuery({
    name: 'step',
    required: false,
    description:
      'Resolution step as a Prometheus duration string, e.g. "30s", "5m" (default: 1m)',
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
  @ApiResponse({ status: 404, description: 'Training run not found' })
  async getMetrics(
    @Param('projectId') projectId: string,
    @Param('runId') runId: string,
    @Query() query: MetricsQueryDto,
  ): Promise<MetricsResponseDto> {
    return await this.metricsService.getMetrics(projectId, runId, query);
  }

  @Sse('stream')
  @RequireProjectRole(ProjectRole.MEMBER)
  @ApiOperation({
    summary: 'Stream live FL metrics (SSE)',
    description:
      'Opens a Server-Sent Events connection that emits an instant metric snapshot every 5 s. ' +
      'Custom FAB metrics are included automatically.',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID', type: String })
  @ApiParam({ name: 'runId', description: 'Training run UUID', type: String })
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
    @Param('runId') runId: string,
  ): Observable<MessageEvent> {
    return this.metricsService
      .streamMetrics(projectId, runId)
      .pipe(map((data) => ({ data })));
  }
}
