import {
  forwardRef,
  Inject,
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
import { DockerService } from '../../docker/docker.service';
import { FlowerService } from '../../flower/services/flower.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectsService } from '../../projects/projects.service';
import {
  base32ToUuid,
  generatePSKWithHash,
  uuidToBase32,
  validatePSK,
} from '../../utils';
import { ListNodesQueryDto } from '../nodes.dto';
import { CreateNodeInput, NodeCertificateBundle } from '../nodes.interface';
import { CertificateService } from './certificate.service';
import { NodeSignatureService } from './signature.service';

@Injectable()
export class NodesService {
  private readonly logger: Logger = new Logger(NodesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => FlowerService))
    private readonly flowerService: FlowerService,
    private readonly projectsService: ProjectsService,
    private readonly configService: ConfigService,
    private readonly dockerService: DockerService,
    private readonly certificateService: CertificateService,
    private readonly signatureService: NodeSignatureService,
  ) {}

  async create(input: CreateNodeInput): Promise<{ node: Node; psk: string }> {
    if (input.projectId) {
      const project = await this.projectsService.getProjectById(
        input.projectId,
      );
      if (project.organizationId !== input.organizationId) {
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
        organizationId: input.organizationId,
        projectId: input.projectId,
        createdById: input.userId,
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

  async getNodesByProject(projectId: string): Promise<Node[]> {
    return this.prisma.node.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    nodeId: string,
    data: Prisma.NodeUncheckedUpdateInput,
  ): Promise<Node> {
    const node = await this.findById(nodeId);

    if (data.projectId) {
      const project = await this.projectsService.getProjectById(
        data.projectId as string,
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
      data,
    });
  }

  async remove(nodeId: string): Promise<void> {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      include: {
        project: true,
      },
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
        this.logger.warn(
          {
            action: 'container.stop',
            nodeId: node.id,
            containerName,
            err: error instanceof Error ? error : new Error(String(error)),
            issue: 'stop_failed_on_node_removal',
          },
          'Failed to stop Docker container during node removal',
        );
      }
    }

    if (node.flowerNodeId && node.project) {
      try {
        await this.flowerService.removeNodesFromFederation(node.project.id, [
          node.flowerNodeId,
        ]);
      } catch (error) {
        this.logger.warn(
          {
            action: 'federation.remove_nodes',
            nodeId: node.id,
            flowerNodeId: node.flowerNodeId,
            projectId: node.project.id,
            err: error instanceof Error ? error : new Error(String(error)),
            issue: 'removal_failed_on_node_deletion',
          },
          'Failed to remove node from federation during node deletion',
        );
      }

      try {
        await this.flowerService.unregisterNode(node.flowerNodeId);
      } catch (error) {
        this.logger.warn(
          {
            action: 'node.unregister',
            nodeId: node.id,
            flowerNodeId: node.flowerNodeId,
            err: error instanceof Error ? error : new Error(String(error)),
            issue: 'unregister_failed_on_node_deletion',
          },
          'Failed to unregister node from Flower during node deletion',
        );
      }
    }

    await this.prisma.node.delete({ where: { id: node.id } });
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
      include: {
        project: true,
      },
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

    let flowerNodeId: string | undefined;

    const isServerApp = node.metadata
      ? (node.metadata as Record<string, unknown>).containerName !== undefined
      : false;

    if (!isServerApp && node.project) {
      try {
        const pemPublicKey = Buffer.from(ecPublicKey, 'base64').toString(
          'utf-8',
        );
        const publicKeyBuffer = Buffer.from(pemPublicKey, 'utf-8');

        flowerNodeId = await this.flowerService.registerNode(publicKeyBuffer);

        await this.flowerService.ensureFederationExists(
          node.project.id,
          node.project.name,
        );

        await this.flowerService.addNodesToFederation(node.project.id, [
          flowerNodeId,
        ]);

        this.logger.log(
          {
            action: 'node.registered',
            nodeId: node.id,
            nodeName: node.name,
            flowerNodeId,
            projectId: node.project.id,
          },
          'Node registered and added to federation',
        );
      } catch (error) {
        this.logger.error(
          {
            action: 'node.register',
            nodeId: node.id,
            nodeName: node.name,
            projectId: node.project?.id,
            err: error instanceof Error ? error : new Error(String(error)),
          },
          'Failed to register node with Flower during activation',
        );
        throw error;
      }
    }

    const pemPublicKey = Buffer.from(ecPublicKey, 'base64').toString('utf8');
    const clientCert = await this.certificateService.issueClientCert(
      node.id,
      pemPublicKey,
    );

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

    const rootCa = fs.readFileSync(
      this.configService.getOrThrow<string>('BACKEND_CA_PATH'),
      'utf8',
    );

    return {
      rootCa,
      clientCert,
      nodeId: flowerNodeId,
    };
  }

  async rotate(
    nodeId: string,
    challenge: string,
    signature: string,
  ): Promise<NodeCertificateBundle> {
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

    const pemPublicKey = Buffer.from(node.ecPublicKey, 'base64').toString(
      'utf8',
    );
    const clientCert = await this.certificateService.issueClientCert(
      node.id,
      pemPublicKey,
    );

    const rootCa = fs.readFileSync(
      this.configService.getOrThrow<string>('BACKEND_CA_PATH'),
      'utf8',
    );

    await this.prisma.node.update({
      where: { id: node.id },
      data: { lastActiveAt: new Date() },
    });

    return { rootCa, clientCert, nodeId: node.id };
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
