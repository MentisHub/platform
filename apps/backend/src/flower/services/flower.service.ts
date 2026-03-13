import { credentials, Metadata } from '@grpc/grpc-js';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ControlClient } from '@platform/proto';
import { Federation } from '@platform/proto/dist/gen/ts/flwr/proto/federation';
import * as fs from 'fs';
import { StartRunOptions } from '../flower.interface';

@Injectable()
export class FlowerService implements OnModuleInit {
  private readonly logger: Logger = new Logger(FlowerService.name);

  private controlClient: ControlClient;

  constructor(private readonly configService: ConfigService) {}

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

    this.controlClient = new ControlClient(`${grpcHost}:9093`, sslCredentials);

    this.logger.log(
      {
        action: 'grpc.init',
        endpoint: `${grpcHost}:9093`,
      },
      'Flower gRPC client initialized',
    );
  }

  async registerNode(publicKeyBytes: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      this.controlClient.registerNode(
        { publicKey: new Uint8Array(publicKeyBytes) },
        new Metadata(),
        (error, response) => {
          if (error) {
            reject(error);
            return;
          }

          if (!response || response.nodeId === undefined) {
            const err = new Error('No nodeId returned from registerNode');
            reject(err);
            return;
          }

          resolve(response.nodeId);
        },
      );
    });
  }

  async unregisterNode(nodeId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.controlClient.unregisterNode({ nodeId }, new Metadata(), (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  async createFederation(
    projectId: string,
    description?: string,
  ): Promise<Federation | undefined> {
    return new Promise((resolve, reject) => {
      this.controlClient.createFederation(
        { federationName: projectId, description: description || '' },
        new Metadata(),
        (error, response) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(response.federation);
        },
      );
    });
  }

  async ensureFederationExists(
    projectId: string,
    description?: string,
  ): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
      this.controlClient.createFederation(
        { federationName: projectId, description: description || '' },
        new Metadata(),
        (createError, response) => {
          if (createError) {
            // Treat "already exists" as success
            if (createError.message?.includes('already exists')) {
              resolve(projectId);
              return;
            }
            reject(createError);
            return;
          }

          resolve(response.federation?.name);
        },
      );
    });
  }

  async addNodeToFederation(
    federationName: string,
    nodeId: string,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.controlClient.addNodeToFederation(
        { federationName, nodeId },
        new Metadata(),
        (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        },
      );
    });
  }

  async removeNodeFromFederation(
    federationName: string,
    nodeId: string,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.controlClient.removeNodeFromFederation(
        { federationName, nodeId },
        new Metadata(),
        (error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        },
      );
    });
  }

  private toScalarMap(
    config: Record<string, unknown>,
  ): Record<string, object> {
    const result: Record<string, object> = {};
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'boolean') {
        result[key] = { bool: value };
      } else if (typeof value === 'number') {
        result[key] = { double: value };
      } else if (typeof value === 'string') {
        result[key] = { string: value };
      }
    }
    return result;
  }

  async startRun(options: StartRunOptions): Promise<string> {
    const request = {
      fab: {
        hashStr: options.fabHash,
        content: new Uint8Array(options.fabContent),
        verifications: {},
      },
      overrideConfig: this.toScalarMap(options.overrideConfig || {}),
      federation: options.federation || '@none/default',
      appSpec: '',
      federationOptions: undefined,
      installDeps: true,
    };

    return new Promise((resolve, reject) => {
      this.controlClient.startRun(
        request,
        new Metadata(),
        (error, response) => {
          if (error) {
            reject(error);
            return;
          }

          if (!response || response.runId === undefined) {
            const err = new Error('No runId returned from startRun');
            reject(err);
            return;
          }

          resolve(response.runId);
        },
      );
    });
  }

  async stopRun(runId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.controlClient.stopRun(
        { runId: String(runId) },
        new Metadata(),
        (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        },
      );
    });
  }

  streamEvents(afterTimestamp: number = 0) {
    const stream = this.controlClient.streamEvents(
      {
        afterTimestamp,
      },
      new Metadata(),
    );

    return stream;
  }
}
