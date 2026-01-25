import { credentials } from '@grpc/grpc-js';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ControlClient, FleetClient } from '@platform/proto';
import * as fs from 'fs';
import { uuidToBase32 } from 'src/utils';
import { DockerService } from '../docker/docker.service';
import { buildPyProject } from './utils';

export interface StartRunOptions {
  fabHash: string;
  fabContent: Buffer;
  overrideConfig?: Record<string, any>;
  federation: string;
}

@Injectable()
export class FlowerService implements OnModuleInit {
  private readonly logger = new Logger(FlowerService.name);
  private fleetClient!: FleetClient;
  private controlClient!: ControlClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly dockerService: DockerService,
  ) {}

  onModuleInit() {
    const grpcHost = this.configService.getOrThrow<string>('SUPERLINK_HOST');
    const certPath = this.configService.getOrThrow<string>('BACKEND_CERT_PATH');
    const keyPath = this.configService.getOrThrow<string>('BACKEND_KEY_PATH');
    const caPath = this.configService.getOrThrow<string>('BACKEND_CA_PATH');

    const rootCert = fs.readFileSync(caPath);
    const clientCert = fs.readFileSync(certPath);
    const clientKey = fs.readFileSync(keyPath);

    const sslCredentials = credentials.createSsl(
      rootCert,
      clientKey,
      clientCert,
    );

    this.fleetClient = new FleetClient(`${grpcHost}:9092`, sslCredentials);
    this.controlClient = new ControlClient(`${grpcHost}:9093`, sslCredentials);

    this.logger.log(`Flower gRPC clients initialized for ${grpcHost}`);
  }

  async registerNode(
    sshPublicKey: string,
    trainingId: string,
  ): Promise<string> {
    this.logger.debug('Registering SuperNode with SSH public key via CLI');

    const tmpKeyPath = `/tmp/node-${Date.now()}.pub`;
    const fedName = uuidToBase32(trainingId);
    const pyProjectCmd = buildPyProject(fedName, 'localhost:9093');

    try {
      await this.dockerService.execInContainer('superlink', [
        'sh',
        '-c',
        `printf '%s\n' "${sshPublicKey}" > ${tmpKeyPath} && ${pyProjectCmd}`,
      ]);

      const cmd = `cd /app && flwr supernode register --format json ${tmpKeyPath} /tmp/flwr_${fedName} ${fedName}`;
      const { stdout, stderr } = await this.dockerService.execInContainer(
        'superlink',
        ['sh', '-c', cmd],
      );

      this.logger.debug(`CLI stdout: ${stdout}`);
      if (stderr) {
        this.logger.debug(`CLI stderr: ${stderr}`);
      }

      await this.dockerService.execInContainer('superlink', [
        'sh',
        '-c',
        `rm -f ${tmpKeyPath} && rm -rf /tmp/flwr_${fedName}`,
      ]);

      try {
        const parsed = JSON.parse(stdout) as {
          nodeId?: string;
          'node-id'?: string | number;
        };
        const nodeId = parsed.nodeId || String(parsed['node-id']);

        if (!nodeId) {
          throw new Error(`No node ID found in response: ${stdout}`);
        }

        this.logger.log(`SuperNode registered with ID ${nodeId}`);
        return nodeId;
      } catch {
        const match = stdout.match(/ID:\s*(\d+)/m);
        if (!match) {
          throw new Error(`Unable to parse node ID from output: ${stdout}`);
        }

        const nodeId = match[1];
        this.logger.log(`SuperNode registered with ID ${nodeId}`);
        return nodeId;
      }
    } catch (error) {
      this.logger.error('Failed to register SuperNode', error);
      throw error;
    }
  }

  async deactivateNode(nodeId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.fleetClient.deactivateNode({ nodeId: String(nodeId) }, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async startRun(options: StartRunOptions): Promise<string> {
    const request = {
      fab: {
        hashStr: options.fabHash,
        content: new Uint8Array(options.fabContent),
        verifications: {},
      },
      overrideConfig: {},
      federation: 'default', //options.federation,
      appSpec: '',
      federationOptions: undefined,
    };

    return new Promise((resolve, reject) => {
      this.controlClient.startRun(request, (error, response) => {
        if (error) {
          reject(error);
          return;
        }

        if (!response || response.runId === undefined) {
          reject(new Error('No runId returned'));
          return;
        }

        resolve(response.runId);
      });
    });
  }

  async stopRun(runId: number): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.controlClient.stopRun(
        { runId: String(runId) },
        (error, response) => {
          if (error) {
            reject(error);
          } else {
            resolve(response.success);
          }
        },
      );
    });
  }
}
