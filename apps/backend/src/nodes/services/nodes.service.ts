import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ErrorCode } from '@platform/contracts';
import { Node, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { FlowerService } from '../../flower/flower.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectsService } from '../../projects/projects.service';
import { TrainingService } from '../../training/training.service';
import { generatePSKWithHash, hashPSK, uuidToBase32 } from '../../utils';
import { CreateNodeDto, ListNodesQueryDto, UpdateNodeDto } from '../nodes.dto';
import { NodeCertificateBundle } from '../nodes.interface';
import { NodeCertificateService } from './node-cert.service';

@Injectable()
export class NodesService {
  private readonly logger = new Logger(NodesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly flowerService: FlowerService,
    private readonly projectsService: ProjectsService,
    private readonly nodeCertService: NodeCertificateService,
    @Inject(forwardRef(() => TrainingService))
    private readonly trainingService: TrainingService,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    input: CreateNodeDto,
  ): Promise<{ node: Node; psk: string }> {
    if (input.projectId) {
      await this.projectsService.getProject(input.projectId, organizationId);
    }

    const { psk, hash } = generatePSKWithHash();
    const node = await this.prisma.node.create({
      data: {
        name: input.name || `node-${randomBytes(4).toString('hex')}`,
        id: hash,
        metadata: input.metadata,
        organizationId,
        projectId: input.projectId,
        createdById: userId,
      },
    });

    return { node, psk: `${uuidToBase32(organizationId)}.${psk}` };
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

  async findById(organizationId: string, nodeId: string): Promise<Node> {
    const node = await this.prisma.node.findFirst({
      where: {
        id: nodeId,
        organizationId,
      },
    });

    if (!node) {
      throw new NotFoundException({
        code: ErrorCode.NODE_NOT_FOUND,
        message: 'Node not found',
      });
    }

    return node;
  }

  async update(
    organizationId: string,
    nodeId: string,
    input: UpdateNodeDto,
  ): Promise<Node> {
    const node = await this.findById(organizationId, nodeId);

    if (input.projectId) {
      await this.projectsService.getProject(input.projectId, organizationId);
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

  async remove(organizationId: string, nodeId: string): Promise<void> {
    const node = await this.findById(organizationId, nodeId);
    await this.prisma.node.delete({ where: { id: node.id } });
  }

  async bootstrap(
    psk: string,
    csr: string,
    ecPublicKey: string,
  ): Promise<NodeCertificateBundle> {
    const pskParts = psk.split('.');
    const actualPsk = pskParts.length === 2 ? pskParts[1] : psk;
    const pskHash = hashPSK(actualPsk);

    const node = await this.prisma.node.findFirst({
      where: {
        id: pskHash,
        certificate: null,
      },
      include: {
        organization: {
          include: {
            ca: true,
          },
        },
      },
    });

    if (!node) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_NODE_CREDENTIALS,
        message: 'Node not found or PSK already in use',
      });
    }

    const { cert, rootCa } = await this.nodeCertService.issueCertificate(
      node,
      csr,
    );

    const trainingRunId =
      await this.trainingService.getActiveTrainingRunForNode(node.id);

    const isServerApp = node.name.startsWith('serverapp-');

    await this.prisma.$transaction(async (tx) => {
      let flowerNodeId: string | undefined;

      if (trainingRunId && !isServerApp) {
        flowerNodeId = await this.flowerService.registerNode(
          ecPublicKey,
          trainingRunId,
        );
      }

      await this.nodeCertService.create(
        {
          node: { connect: { id: node.id } },
          serialNumber: cert.serial_number.replace(/:/g, '').toLowerCase(),
          issuedAt: new Date(),
          expiresAt: new Date(cert.expiration * 1000),
          revokedAt: null,
        },
        tx,
      );

      await tx.node.update({
        where: { id: node.id },
        data: {
          status: 'ONLINE',
          ...(flowerNodeId && {
            metadata: {
              ...(node.metadata as object),
              flowerNodeId,
            },
          }),
        },
      });
    });

    return {
      certificate: cert.certificate,
      issuingCa: cert.issuing_ca,
      caChain: cert.ca_chain,
      serialNumber: cert.serial_number,
      expiration: cert.expiration,
      rootCa,
    };
  }

  async renewCertificate(
    certificateSerial: string,
    csr: string,
  ): Promise<NodeCertificateBundle> {
    const certificate = await this.nodeCertService.findOne(certificateSerial);
    const node = certificate.node;

    if (!node) {
      throw new NotFoundException({
        code: ErrorCode.NODE_NOT_FOUND,
        message: 'Node not found',
      });
    }

    if (certificate.expiresAt < new Date()) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_NODE_CREDENTIALS,
        message: 'Certificate expired. Please bootstrap the node again.',
      });
    }

    const { cert, rootCa, mountPath } =
      await this.nodeCertService.issueCertificate(node, csr);

    await this.prisma.$transaction(async (tx) => {
      await this.nodeCertService.update(
        certificate.nodeId,
        { revokedAt: new Date() },
        tx,
      );

      await this.nodeCertService.revokeCertificate(
        mountPath,
        certificate.serialNumber,
      );

      await this.nodeCertService.create(
        {
          node: { connect: { id: node.id } },
          serialNumber: cert.serial_number.replace(/:/g, ''),
          issuedAt: new Date(),
          expiresAt: new Date(cert.expiration * 1000),
          revokedAt: null,
        },
        tx,
      );
    });

    return {
      certificate: cert.certificate,
      issuingCa: cert.issuing_ca,
      caChain: cert.ca_chain,
      serialNumber: cert.serial_number,
      expiration: cert.expiration,
      rootCa,
    };
  }
}
