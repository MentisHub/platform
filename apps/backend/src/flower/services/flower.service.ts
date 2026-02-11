import { credentials, Metadata } from '@grpc/grpc-js';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ControlClient } from '@platform/proto';
import * as fs from 'fs';
import { StartRunOptions } from '../flower.interface';

@Injectable()
export class FlowerService implements OnModuleInit {
  private readonly logger = new Logger(FlowerService.name);
  private controlClient!: ControlClient;

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

    this.logger.log(`Flower gRPC clients initialized for ${grpcHost}`);
  }

  async registerNode(publicKeyBytes: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      this.controlClient.registerNode(
        { publicKey: new Uint8Array(publicKeyBytes) },
        new Metadata(),
        (error, response) => {
          if (error) {
            this.logger.error('Failed to register SuperNode', error);
            reject(error);
            return;
          }

          if (!response || response.nodeId === undefined) {
            reject(new Error('No nodeId returned from registerNode'));
            return;
          }

          this.logger.log(`SuperNode registered with ID ${response.nodeId}`);
          resolve(response.nodeId);
        },
      );
    });
  }

  async unregisterNode(nodeId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.controlClient.unregisterNode({ nodeId }, new Metadata(), (error) => {
        if (error) {
          this.logger.error('Failed to unregister node', error);
          reject(error);
        } else {
          this.logger.log(`SuperNode ${nodeId} unregistered successfully`);
          resolve();
        }
      });
    });
  }

  async createFederation(
    projectId: string,
    description?: string,
  ): Promise<string> {
    const federationName = `@none/project-${projectId}`;

    return new Promise((resolve, reject) => {
      this.controlClient.createFederation(
        { name: federationName, description: description || '' },
        new Metadata(),
        (error, response) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(response.federation.name);
        },
      );
    });
  }

  async ensureFederationExists(
    projectId: string,
    description?: string,
  ): Promise<string> {
    const federationName = `@none/project-${projectId}`;

    return new Promise((resolve, reject) => {
      this.controlClient.showFederation(
        { federationName },
        new Metadata(),
        (error) => {
          if (error) {
            this.controlClient.createFederation(
              { name: federationName, description: description || '' },
              new Metadata(),
              (createError, response) => {
                if (createError) {
                  reject(createError);
                  return;
                }
                resolve(response.federation.name);
              },
            );
            return;
          }
          resolve(federationName);
        },
      );
    });
  }

  async addNodesToFederation(
    federationName: string,
    nodeIds: string[],
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.controlClient.addNodeToFederation(
        {
          federationName,
          nodeIds: nodeIds,
        },
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

  async removeNodesFromFederation(
    federationName: string,
    nodeIds: string[],
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.controlClient.removeNodeFromFederation(
        {
          federationName,
          nodeIds,
        },
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

  async startRun(options: StartRunOptions): Promise<string> {
    const request = {
      fab: {
        hashStr: options.fabHash,
        content: new Uint8Array(options.fabContent),
        verifications: {},
      },
      overrideConfig: options.overrideConfig || {},
      federation: options.federation || '@none/default',
      appSpec: '',
      federationOptions: undefined,
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
            reject(new Error('No runId returned'));
            return;
          }

          resolve(response.runId);
        },
      );
    });
  }

  async stopRun(runId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.controlClient.stopRun(
        { runId: String(runId) },
        new Metadata(),
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

  streamEvents(afterTimestamp: number = 0) {
    const request = {
      afterTimestamp,
    };

    const metadata = new Metadata();
    const stream = this.controlClient.streamEvents(request, metadata);

    stream.on('error', (error: Error & { code?: number }) => {
      if (error.code === 2) {
        this.logger.debug(`No active runs to stream events`);
      } else {
        this.logger.error(`StreamEvents error:`, error);
      }
    });

    stream.on('end', () => {
      this.logger.debug(`StreamEvents ended`);
    });

    return stream;
  }
}
