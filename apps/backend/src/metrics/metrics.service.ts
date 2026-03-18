import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  metricsResponseSchema,
  metricsStreamEventSchema,
} from '@platform/contracts';
import { EMPTY, Observable, interval } from 'rxjs';
import { catchError, startWith, switchMap } from 'rxjs/operators';
import { TrainingService } from 'src/training/services/training.service';
import {
  MetricsQueryDto,
  MetricsResponseDto,
  MetricsStreamEventDto,
} from './metrics.dto';
import {
  PrometheusInstantResponse,
  PrometheusRangeResponse,
} from './metrics.interface';

const STREAM_INTERVAL_MS = 5_000;

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly prometheusUrl: string;

  constructor(
    private readonly trainingService: TrainingService,
    private readonly config: ConfigService,
  ) {
    this.prometheusUrl = this.config.getOrThrow<string>(
      'PROMETHEUS_URL',
      'http://prometheus:9090',
    );
  }

  private buildLabelFilter(ids: string[]): string {
    return ids.length === 1
      ? `run_id="${ids[0]}"`
      : `run_id=~"${ids.join('|')}"`;
  }

  async getProjectMetrics(
    projectId: string,
    query: MetricsQueryDto,
  ): Promise<MetricsResponseDto> {
    const now = Math.floor(Date.now() / 1000);
    const resolvedStart = query.start ?? String(now - 86_400);
    const resolvedEnd = query.end ?? String(now);
    const resolvedStep = query.step ?? '1m';

    const timeRange = {
      start: resolvedStart,
      end: resolvedEnd,
      step: resolvedStep,
    };

    const ids = await this.trainingService.getTrainingRunIdsByProject(
      projectId,
      query.trainingRunId,
    );
    if (ids.length === 0) {
      return metricsResponseSchema.parse({ projectId, timeRange, series: [] });
    }

    const params = new URLSearchParams({
      query: `{${this.buildLabelFilter(ids)}}`,
      start: resolvedStart,
      end: resolvedEnd,
      step: resolvedStep,
    });

    let body: PrometheusRangeResponse;
    try {
      const res = await fetch(
        `${this.prometheusUrl}/api/v1/query_range?${params.toString()}`,
      );
      if (!res.ok) {
        this.logger.warn(
          { projectId, status: res.status },
          'Prometheus returned non-2xx response',
        );
        throw new InternalServerErrorException('Failed to query metrics');
      }
      body = (await res.json()) as PrometheusRangeResponse;
    } catch (err: unknown) {
      if (err instanceof InternalServerErrorException) throw err;
      this.logger.error({ err, projectId }, 'Prometheus request failed');
      throw new InternalServerErrorException('Failed to query metrics');
    }

    if (body.status !== 'success') {
      this.logger.warn(
        { projectId, error: body.error },
        'Prometheus query failed',
      );
      throw new InternalServerErrorException('Metrics query failed');
    }

    const series = (body.data?.result ?? []).map((item) => ({
      metric: item.metric,
      values: item.values,
    }));

    return metricsResponseSchema.parse({ projectId, timeRange, series });
  }

  private async pollInstantMetrics(
    projectId: string,
    trainingRunId?: string,
  ): Promise<MetricsStreamEventDto> {
    const ids = await this.trainingService.getTrainingRunIdsByProject(
      projectId,
      trainingRunId,
    );

    if (ids.length === 0) {
      return metricsStreamEventSchema.parse({
        projectId,
        timestamp: Math.floor(Date.now() / 1000),
        series: [],
      });
    }

    const params = new URLSearchParams({
      query: `{${this.buildLabelFilter(ids)}}`,
    });

    const res = await fetch(
      `${this.prometheusUrl}/api/v1/query?${params.toString()}`,
    );
    if (!res.ok) {
      throw new Error(
        `Prometheus instant query failed with status ${res.status}`,
      );
    }

    const body = (await res.json()) as PrometheusInstantResponse;
    if (body.status !== 'success') {
      throw new Error(`Prometheus returned error: ${body.error ?? 'unknown'}`);
    }

    const series = (body.data?.result ?? []).map((item) => ({
      metric: item.metric,
      value: item.value,
    }));

    return metricsStreamEventSchema.parse({
      projectId,
      timestamp: Math.floor(Date.now() / 1000),
      series,
    });
  }

  streamProjectMetrics(
    projectId: string,
    trainingRunId?: string,
  ): Observable<MetricsStreamEventDto> {
    return interval(STREAM_INTERVAL_MS).pipe(
      startWith(0),
      switchMap(() =>
        new Observable<MetricsStreamEventDto>((sub) => {
          this.pollInstantMetrics(projectId, trainingRunId)
            .then((event) => {
              sub.next(event);
              sub.complete();
            })
            .catch((err: unknown) => sub.error(err));
        }).pipe(
          catchError((err: unknown) => {
            this.logger.warn({ projectId, err }, 'Metrics stream poll failed');
            return EMPTY;
          }),
        ),
      ),
    );
  }
}
