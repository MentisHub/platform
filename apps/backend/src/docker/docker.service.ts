import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Docker from 'dockerode';

@Injectable()
export class DockerService implements OnModuleInit {
  private readonly logger: Logger = new Logger(DockerService.name);
  private docker: Docker;

  private readonly backendInternalUrl: string;
  private readonly otelInternalUrl: string;
  private readonly superlinkHostname: string;

  constructor(private readonly configService: ConfigService) {
    this.backendInternalUrl = configService.getOrThrow<string>(
      'BACKEND_INTERNAL_URL',
    );
    this.otelInternalUrl =
      configService.getOrThrow<string>('OTEL_INTERNAL_URL');
    this.superlinkHostname =
      configService.getOrThrow<string>('SUPERLINK_HOST') + ':9091';
  }

  onModuleInit() {
    const dockerSocket = this.configService.getOrThrow<string>('DOCKER_SOCKET');
    this.docker = new Docker({ socketPath: dockerSocket });
    this.logger.log(
      { action: 'init', socketPath: dockerSocket },
      'Docker initialized',
    );
  }

  async startSuperExecContainer(
    trainingRunId: string,
    nodePsk: string,
  ): Promise<string> {
    const containerName = `serverapp-${trainingRunId.slice(0, 8)}`;

    try {
      const existingContainer = this.docker.getContainer(containerName);
      const info = await existingContainer.inspect();

      if (info.State.Running) {
        return containerName;
      }

      await existingContainer.remove({ force: true });
    } catch {
      // Container doesn't exist, continue
    }

    const container = await this.docker.createContainer({
      name: containerName,
      Image: 'mentishub/fl-app:latest',
      Env: [
        `NODE_PSK=${nodePsk}`,
        `BACKEND_URL=${this.backendInternalUrl}/v1`,
        `OTEL_EXPORTER_OTLP_ENDPOINT=${this.otelInternalUrl}`,
      ],
      Cmd: [
        'flower-superexec',
        '--plugin-type',
        'serverapp',
        '--appio-api-address',
        `${this.superlinkHostname}`,
        '--insecure',
      ],
      HostConfig: {
        NetworkMode: 'mentishub-network',
        RestartPolicy: {
          Name: 'on-failure',
          MaximumRetryCount: 3,
        },
      },
      Labels: {
        'mentishub.service': 'superexec',
        'mentishub.type': 'serverapp',
        'mentishub.training-run-id': trainingRunId,
      },
    });

    await container.start();

    this.logger.debug(
      {
        action: 'container.started',
        containerName,
        trainingRunId,
      },
      'SuperExec container started',
    );
    return containerName;
  }

  async stopSuperExecContainer(containerName: string): Promise<void> {
    const container = this.docker.getContainer(containerName);
    await container.stop({ t: 10 });
    await container.remove({ force: true });

    this.logger.debug(
      { action: 'container.removed', containerName },
      'SuperExec container stopped and removed',
    );
  }
}
