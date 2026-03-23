import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
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
  PrometheusMetadataResponse,
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

  async getMetrics(
    projectId: string,
    runId: string,
    query: MetricsQueryDto,
  ): Promise<MetricsResponseDto> {
    const now = Math.floor(Date.now() / 1000);
    const run = await this.trainingService.getRunForMetrics(projectId, runId);
    if (!run) {
      throw new NotFoundException('Training run not found');
    }

    const resolvedStart = run.startedAt
      ? String(Math.floor(run.startedAt.getTime() / 1000))
      : String(now - 86_400);
    const resolvedEnd = run.completedAt
      ? String(Math.floor(run.completedAt.getTime() / 1000))
      : String(now);
    const resolvedStep = query.step ?? '1m';
    const timeRange = {
      start: resolvedStart,
      end: resolvedEnd,
      step: resolvedStep,
    };

    const params = new URLSearchParams({
      query: `{run_id="${run.flowerRunId}"}`,
      ...timeRange,
    });

    let body: PrometheusRangeResponse;
    let metaBody: PrometheusMetadataResponse;
    try {
      [body, metaBody] = (await Promise.all([
        fetch(
          `${this.prometheusUrl}/api/v1/query_range?${params.toString()}`,
        ).then((r) => r.json()),
        fetch(`${this.prometheusUrl}/api/v1/metadata`).then((r) => r.json()),
      ])) as [PrometheusRangeResponse, PrometheusMetadataResponse];
    } catch (err: unknown) {
      this.logger.error({ err, projectId, runId }, 'Prometheus request failed');
      throw new InternalServerErrorException('Failed to query metrics');
    }

    if (body.status !== 'success') {
      this.logger.warn(
        { projectId, runId, error: body.error },
        'Prometheus query failed',
      );
      throw new InternalServerErrorException('Metrics query failed');
    }

    const metaMap = new Map(
      Object.entries(metaBody.data ?? {}).map(([name, entries]) => [
        name,
        entries[0],
      ]),
    );

    const series = (body.data?.result ?? []).map((item) => {
      const fullName = item.metric.__name__;
      const meta = fullName ? metaMap.get(fullName) : undefined;
      return {
        metric: item.metric,
        values: item.values,
        ...(meta && { metadata: { type: meta.type, help: meta.help } }),
      };
    });

    return metricsResponseSchema.parse({ projectId, timeRange, series });
  }

  private async pollInstantMetrics(
    projectId: string,
    runId: string,
  ): Promise<MetricsStreamEventDto> {
    const run = await this.trainingService.getRunForMetrics(projectId, runId);

    if (!run) {
      return metricsStreamEventSchema.parse({
        projectId,
        timestamp: Math.floor(Date.now() / 1000),
        series: [],
      });
    }

    const params = new URLSearchParams({
      query: `{run_id="${run.flowerRunId}"}`,
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

  streamMetrics(
    projectId: string,
    runId: string,
  ): Observable<MetricsStreamEventDto> {
    return interval(STREAM_INTERVAL_MS).pipe(
      startWith(0),
      switchMap(() =>
        new Observable<MetricsStreamEventDto>((sub) => {
          this.pollInstantMetrics(projectId, runId)
            .then((event) => {
              sub.next(event);
              sub.complete();
            })
            .catch((err: unknown) => sub.error(err));
        }).pipe(
          catchError((err: unknown) => {
            this.logger.warn(
              { projectId, runId, err },
              'Metrics stream poll failed',
            );
            return EMPTY;
          }),
        ),
      ),
    );
  }
}
