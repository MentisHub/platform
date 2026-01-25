import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Docker from 'dockerode';

@Injectable()
export class DockerService implements OnModuleInit {
  private readonly logger = new Logger(DockerService.name);
  private docker!: Docker;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const dockerSocket = this.config.getOrThrow<string>('DOCKER_SOCKET');
    this.docker = new Docker({ socketPath: dockerSocket });
    this.logger.log(`Docker initialized on ${dockerSocket}`);
  }

  async execInContainer(
    containerName: string,
    cmd: string[],
  ): Promise<{ stdout: string; stderr: string }> {
    const container = this.docker.getContainer(containerName);

    const exec = await container.exec({
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ Detach: false });

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      stream.on('data', (chunk: Buffer) => {
        const type = chunk.readUInt8(0);
        const payload = chunk.subarray(8).toString();

        if (type === 1) stdout += payload;
        if (type === 2) stderr += payload;
      });

      stream.on('end', () => resolve({ stdout, stderr }));
      stream.on('error', reject);
    });
  }

  async startSuperExecContainer(
    trainingRunId: string,
    nodePsk: string,
    superlinkHost: string,
  ): Promise<string> {
    const containerName = `serverapp-${trainingRunId.slice(0, 8)}`;

    try {
      const existingContainer = this.docker.getContainer(containerName);
      const info = await existingContainer.inspect();

      if (info.State.Running) {
        this.logger.debug(
          `SuperExec container ${containerName} already running`,
        );
        return containerName;
      }

      await existingContainer.remove({ force: true });
    } catch {
      // Container doesn't exist, continue
    }

    const container = await this.docker.createContainer({
      name: containerName,
      Image: 'mentishub/fl-serverapp:latest',
      Env: [`NODE_PSK=${nodePsk}`, `BACKEND_URL=https://platform-backend:3000`],
      Cmd: [
        'flower-superexec',
        '--plugin-type',
        'serverapp',
        '--appio-api-address',
        `${superlinkHost}:9091`,
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

    this.logger.debug(`SuperExec container ${containerName} started`);
    return containerName;
  }

  async stopSuperExecContainer(containerName: string): Promise<void> {
    this.logger.log(`Stopping SuperExec container: ${containerName}`);

    try {
      const container = this.docker.getContainer(containerName);
      await container.stop({ t: 10 });
      await container.remove({ force: true });
      this.logger.log(
        `SuperExec container ${containerName} stopped and removed`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to stop SuperExec container ${containerName}: ${error}`,
      );
    }
  }
}
