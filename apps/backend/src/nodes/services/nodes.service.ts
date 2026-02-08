import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '@platform/contracts';
import { Node, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import { AuthenticationService } from 'src/authentication/auth.service';
import { DockerService } from '../../docker/docker.service';
import { FlowerService } from '../../flower/services/flower.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectsService } from '../../projects/projects.service';
import { RunParticipantService } from '../../training/services/run-participant.service';
import {
  base32ToUuid,
  generatePSKWithHash,
  uuidToBase32,
  validatePSK,
} from '../../utils';
import {
  CreateNodeDto,
  HeartbeatResponseDto,
  ListNodesQueryDto,
  UpdateNodeDto,
} from '../nodes.dto';
import { NodeCertificateBundle } from '../nodes.interface';
import { NodeRefreshTokenService } from './refresh-token.service';
import { NodeSignatureService } from './signature.service';

@Injectable()
export class NodesService {
  private readonly logger = new Logger(NodesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly flowerService: FlowerService,
    private readonly projectsService: ProjectsService,
    private readonly runParticipantService: RunParticipantService,
    private readonly configService: ConfigService,
    private readonly dockerService: DockerService,
    private readonly authService: AuthenticationService,
    private readonly refreshTokenService: NodeRefreshTokenService,
    private readonly signatureService: NodeSignatureService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    input: CreateNodeDto,
  ): Promise<{ node: Node; psk: string }> {
    if (input.projectId) {
      const project = await this.projectsService.getProjectById(
        input.projectId,
      );
      if (project.organizationId !== organizationId) {
        throw new NotFoundException({
          code: ErrorCode.PROJECT_NOT_FOUND,
          message: 'Project not found',
        });
      }
    }

    const { psk, hash } = generatePSKWithHash();
    const node = await this.prisma.node.create({
      data: {
        name: input.name || `node-${randomBytes(4).toString('hex')}`,
        metadata: input.metadata,
        pskHash: hash,
        organizationId,
        projectId: input.projectId,
        createdById: userId,
      },
    });

    return { node, psk: `${uuidToBase32(node.id)}.${psk}` };
  }

  async findAll(
    organizationId: string,
    input: ListNodesQueryDto,
  ): Promise<{ nodes: Node[]; total: number }> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      projectId,
      sortBy = 'createdAt',
      order = 'desc',
    } = input;

    const where: Prisma.NodeWhereInput = {
      organizationId,
    };

    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    const [nodes, total] = await Promise.all([
      this.prisma.node.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          [sortBy]: order,
        },
      }),
      this.prisma.node.count({ where }),
    ]);

    return { nodes, total };
  }

  async findById(nodeId: string): Promise<Node> {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new NotFoundException({
        code: ErrorCode.NODE_NOT_FOUND,
        message: 'Node not found',
      });
    }

    return node;
  }

  async update(nodeId: string, input: UpdateNodeDto): Promise<Node> {
    const node = await this.findById(nodeId);

    if (input.projectId) {
      const project = await this.projectsService.getProjectById(
        input.projectId,
      );
      if (project.organizationId !== node.organizationId) {
        throw new NotFoundException({
          code: ErrorCode.PROJECT_NOT_FOUND,
          message: 'Project not found',
        });
      }
    }

    return this.prisma.node.update({
      where: { id: node.id },
      data: {
        name: input.name,
        metadata: input.metadata,
        projectId: input.projectId,
      },
    });
  }

  async remove(nodeId: string): Promise<void> {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new NotFoundException({
        code: ErrorCode.NODE_NOT_FOUND,
        message: 'Node not found',
      });
    }

    const metadata = node.metadata as Record<string, unknown> | null;
    const containerName =
      metadata && typeof metadata.containerName === 'string'
        ? metadata.containerName
        : null;

    if (containerName) {
      try {
        await this.dockerService.stopSuperExecContainer(containerName);
      } catch (error) {
        this.logger.warn({
          message: 'Failed to stop Docker container',
          nodeId: node.id,
          containerName,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    if (node.flowerNodeId) {
      try {
        await this.flowerService.unregisterNode(node.flowerNodeId);
      } catch (error) {
        this.logger.warn({
          message: 'Failed to unregister node from Flower',
          nodeId: node.id,
          flowerNodeId: node.flowerNodeId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    await this.prisma.node.delete({ where: { id: node.id } });
  }

  async updateNodeStatus(
    nodeId: string,
    newStatus:
      | 'CREATED'
      | 'INITIALIZING'
      | 'READY'
      | 'ACTIVE'
      | 'ERROR'
      | 'OFFLINE',
  ): Promise<Node> {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      select: { id: true, status: true, name: true },
    });

    if (!node) {
      throw new NotFoundException({
        code: ErrorCode.NODE_NOT_FOUND,
        message: 'Node not found',
      });
    }

    const updatedNode = await this.prisma.node.update({
      where: { id: nodeId },
      data: { status: newStatus },
    });

    return updatedNode;
  }

  async activate(
    psk: string,
    ecPublicKey: string,
  ): Promise<NodeCertificateBundle> {
    const pskParts = psk.split('.');
    if (pskParts.length !== 2) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_NODE_CREDENTIALS,
        message: 'Invalid PSK format',
      });
    }

    const nodeId = base32ToUuid(pskParts[0]);
    const pskSecret = pskParts[1];

    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
    });

    if (!node) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_NODE_CREDENTIALS,
        message: 'Node not found',
      });
    }

    if (!node.pskHash || !validatePSK(pskSecret, node.pskHash)) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_NODE_CREDENTIALS,
        message: 'Invalid PSK',
      });
    }

    if (node.activatedAt) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_NODE_CREDENTIALS,
        message: 'PSK already used',
      });
    }
    const trainingRunData =
      await this.runParticipantService.getActiveTrainingRunForNode(node.id);
    let flowerNodeId: string | undefined;
    if (trainingRunData && !trainingRunData.isServerApp) {
      try {
        const pemPublicKey = Buffer.from(ecPublicKey, 'base64').toString(
          'utf-8',
        );
        const publicKeyBuffer = Buffer.from(pemPublicKey, 'utf-8');

        flowerNodeId = await this.flowerService.registerNode(publicKeyBuffer);
      } catch (error) {
        this.logger.error({
          message: 'Failed to register node with Flower',
          nodeId: node.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const accessToken = await this.authService.generateToken(
      {
        sub: node.id,
      },
      '15m',
      'RS256',
    );

    const refreshToken = await this.refreshTokenService.create(node.id, 30);

    await this.prisma.node.update({
      where: { id: node.id },
      data: {
        status: 'INITIALIZING',
        flowerNodeId,
        ecPublicKey,
        activatedAt: new Date(),
        lastActiveAt: new Date(),
      },
    });

    const caPath = this.configService.getOrThrow<string>('BACKEND_CA_PATH');
    let rootCa: string;
    try {
      rootCa = fs.readFileSync(caPath, 'utf8');
    } catch (error) {
      this.logger.error(`Failed to read Root CA from ${caPath}`, error);
      rootCa = '';
    }

    return {
      rootCa,
      nodeId: flowerNodeId,
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  async refresh(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    const nodeId = await this.refreshTokenService.validate(refreshToken);

    if (!nodeId) {
      throw new UnauthorizedException({
        code: ErrorCode.TOKEN_INVALID,
        message: 'Invalid or expired refresh token',
      });
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const accessToken = await this.authService.generateToken(
      { sub: nodeId },
      '15m',
      'RS256',
    );

    const newRefreshToken = await this.refreshTokenService.rotate(refreshToken);

    if (!newRefreshToken) {
      throw new UnauthorizedException({
        code: ErrorCode.TOKEN_INVALID,
        message: 'Failed to rotate refresh token',
      });
    }

    await this.prisma.node.update({
      where: { id: nodeId },
      data: { lastActiveAt: new Date() },
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresAt,
    };
  }

  async recover(
    nodeId: string,
    challenge: string,
    signature: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      select: { id: true, ecPublicKey: true, activatedAt: true },
    });

    if (!node) {
      throw new UnauthorizedException({
        code: ErrorCode.NODE_NOT_FOUND,
        message: 'Node not found',
      });
    }

    if (!node.activatedAt) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_NODE_CREDENTIALS,
        message: 'Node not activated',
      });
    }

    if (!node.ecPublicKey) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_NODE_CREDENTIALS,
        message: 'No public key registered',
      });
    }

    const isValid = this.signatureService.verifySignature(
      node.ecPublicKey,
      challenge,
      signature,
    );

    if (!isValid) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_NODE_CREDENTIALS,
        message: 'Invalid signature',
      });
    }

    await this.refreshTokenService.revokeAllForNode(node.id);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const accessToken = await this.authService.generateToken(
      { sub: node.id },
      '15m',
      'RS256',
    );

    const refreshToken = await this.refreshTokenService.create(node.id, 30);

    await this.prisma.node.update({
      where: { id: node.id },
      data: { lastActiveAt: new Date() },
    });

    return {
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  async markNodeReady(nodeId: string): Promise<void> {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      select: { id: true, status: true },
    });

    if (!node) {
      throw new NotFoundException({
        code: ErrorCode.NODE_NOT_FOUND,
        message: 'Node not found',
      });
    }

    if (node.status !== 'INITIALIZING') {
      this.logger.warn({
        message:
          'Attempted to mark node as ready but status is not INITIALIZING',
        nodeId,
        currentStatus: node.status,
      });
      return;
    }

    await this.prisma.node.update({
      where: { id: nodeId },
      data: {
        status: 'READY',
        lastActiveAt: new Date(),
      },
    });

    this.logger.log({
      message: 'Node marked as ready',
      nodeId,
    });
  }

  async heartbeat(nodeId: string): Promise<HeartbeatResponseDto> {
    const node = await this.prisma.node.findUnique({ where: { id: nodeId } });
    if (!node) {
      throw new NotFoundException('Node not found');
    }

    await this.prisma.node.update({
      where: { id: nodeId },
      data: { lastActiveAt: new Date() },
    });

    const trainingRunData =
      await this.runParticipantService.getActiveTrainingRunForNode(nodeId);
    let training: { runId: string; fabName: string } | undefined;

    if (trainingRunData && trainingRunData.fab) {
      const { publisherName, name, version, fabHash } = trainingRunData.fab;
      const fabName = `${publisherName}.${name}.${version}.${fabHash}.fab`;
      const runIdBase32 = uuidToBase32(trainingRunData.runId);
      training = {
        runId: runIdBase32,
        fabName,
      };
    }

    return {
      status: node.status,
      training,
    };
  }

  async findByFlowerNodeId(flowerNodeId: string): Promise<Node | null> {
    return this.prisma.node.findUnique({
      where: { flowerNodeId },
    });
  }

  async setFlowerNodeId(nodeId: string, flowerNodeId: string): Promise<Node> {
    return this.prisma.node.update({
      where: { id: nodeId },
      data: { flowerNodeId },
    });
  }
}
