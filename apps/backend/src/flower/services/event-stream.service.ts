import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  forwardRef,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Event, EventType } from '@platform/proto';
import { TrainingService } from '../../training/services/training.service';
import {
  EVENT_TYPE_MAP,
  FlowerEvents,
  FlowerNodeLifecyclePayload,
  FlowerRunEventPayload,
} from '../events/constants';
import { FlowerService } from './flower.service';

@Injectable()
export class FlowerEventStreamService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger = new Logger(FlowerEventStreamService.name);
  private isStreamActive = false;
  private restartTimeout?: NodeJS.Timeout;
  private streamHadError = false;
  private lastTimestamp = 0;

  constructor(
    private readonly flowerService: FlowerService,
    @Inject(forwardRef(() => TrainingService))
    private readonly trainingService: TrainingService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    this.start();
  }

  onModuleDestroy() {
    this.stop();
  }

  start(): void {
    if (this.isStreamActive) {
      this.logger.warn(
        {
          action: 'stream.start',
          issue: 'already_active',
        },
        'Global event stream is already active',
      );
      return;
    }

    this.logger.log(
      {
        action: 'stream.start',
      },
      'Starting flower event stream',
    );
    this.isStreamActive = true;

    const stream = this.flowerService.streamEvents(this.lastTimestamp);

    stream.on(
      'data',
      (response: { events: Event[]; latestTimestamp: number }) => {
        if (response.latestTimestamp > this.lastTimestamp) {
          this.lastTimestamp = response.latestTimestamp;
        }
        if (response.events?.length > 0) {
          for (const event of response.events) {
            void this.processEvent(event);
          }
        }
      },
    );

    stream.on('error', () => {
      this.streamHadError = true;
    });

    stream.on('end', () => {
      this.isStreamActive = false;
      const hadError = this.streamHadError;
      this.streamHadError = false;
      this.scheduleRestart(hadError ? 10000 : 5000);
    });
  }

  stop(): void {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = undefined;
    }
    this.isStreamActive = false;

    this.logger.log(
      {
        action: 'stream.stop',
      },
      'Event stream stopped',
    );
  }

  private scheduleRestart(delayMs: number): void {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
    }

    this.logger.log(
      {
        action: 'stream.restart_scheduled',
        delayMs,
      },
      'Scheduling event stream restart',
    );

    this.restartTimeout = setTimeout(() => this.start(), delayMs);
  }

  private async processEvent(event: Event): Promise<void> {
    try {
      if (
        event.eventType === EventType.NODE_CONNECTED ||
        event.eventType === EventType.NODE_DISCONNECTED
      ) {
        const eventName =
          event.eventType === EventType.NODE_CONNECTED
            ? FlowerEvents.NODE_CONNECTED
            : FlowerEvents.NODE_DISCONNECTED;

        this.eventEmitter.emit(eventName, {
          event,
        } satisfies FlowerNodeLifecyclePayload);
        return;
      }

      if (!event.runId) {
        this.logger.debug(
          {
            action: 'event.process',
            eventType: EventType[event.eventType],
            issue: 'missing_run_id',
          },
          'Event missing run ID',
        );
        return;
      }

      const run = await this.trainingService.getRunByFlowerId(event.runId);
      if (!run) {
        return;
      }
      const runId = run.id;

      const eventName = EVENT_TYPE_MAP[event.eventType];
      if (!eventName) {
        return;
      }

      this.eventEmitter.emit(eventName, {
        runId,
        event,
      } satisfies FlowerRunEventPayload);
    } catch (error) {
      this.logger.error(
        {
          action: 'event.process',
          err: error instanceof Error ? error : new Error(String(error)),
          eventType: EventType[event.eventType],
          runId: event.runId,
        },
        'Error processing event',
      );
    }
  }
}
