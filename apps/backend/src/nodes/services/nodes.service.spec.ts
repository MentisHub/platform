import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '@platform/contracts';
import { NodesService } from './nodes.service';
import { NodeCertificateService } from './node-cert.service';
import { PrismaService } from '../../prisma/prisma.service';
import { VaultService } from '../../vault/vault.service';
import { FlowerService } from '../../flower/flower.service';
import { ProjectsService } from '../../projects/projects.service';
import { TrainingService } from '../../training/training.service';
import { ListNodesQueryDto } from '../nodes.dto';
import {
  createMockPrismaService,
  createMockVaultService,
  createMockFlowerService,
  createMockConfigService,
  mockTransaction,
  type MockPrismaService,
  type MockVaultService,
  type MockFlowerService,
} from '../../../test/mocks';
import {
  NodeFactory,
  NodeCertificateFactory,
  OrganizationFactory,
  OrganizationCAFactory,
  UserFactory,
  ProjectFactory,
} from '../../../test/factories';
import { generatePSKWithHash } from '../../utils';
import type { Node, NodeCertificate } from '@prisma/client';

// Types for test mocks
type NodeWithOrganizationAndCA = Node & {
  organization: {
    id: string;
    name: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
    ca: {
      id: string;
      organizationId: string;
      vaultMountPath: string;
      createdAt: Date;
    } | null;
  };
};

type CertificateWithNode = NodeCertificate & {
  node: NodeWithOrganizationAndCA;
};

describe('NodesService', () => {
  let service: NodesService;
  let prisma: MockPrismaService;
  let vault: MockVaultService;
  let flower: MockFlowerService;
  let nodeCertService: jest.Mocked<NodeCertificateService>;
  let projectsService: jest.Mocked<ProjectsService>;
  let trainingService: jest.Mocked<TrainingService>;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    vault = createMockVaultService();
    flower = createMockFlowerService();

    mockTransaction(prisma);

    nodeCertService = {
      create: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      findNodeCertificateFab: jest.fn(),
      issueCertificate: jest.fn(),
      revokeCertificate: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<NodeCertificateService>;

    projectsService = {
      getProject: jest.fn(),
      getProjectById: jest.fn(),
      getProjectWithCA: jest.fn(),
    } as unknown as jest.Mocked<ProjectsService>;

    trainingService = {
      getActiveTrainingRunForNode: jest.fn(),
    } as unknown as jest.Mocked<TrainingService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodesService,
        { provide: PrismaService, useValue: prisma },
        { provide: VaultService, useValue: vault },
        { provide: FlowerService, useValue: flower },
        { provide: NodeCertificateService, useValue: nodeCertService },
        { provide: ProjectsService, useValue: projectsService },
        { provide: TrainingService, useValue: trainingService },
        { provide: ConfigService, useValue: createMockConfigService() },
      ],
    }).compile();

    service = module.get<NodesService>(NodesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a node with PSK', async () => {
      const user = UserFactory.buildOnboarded();
      const organization = OrganizationFactory.build({ ownerId: user.id });
      const mockNode = NodeFactory.buildInactive({
        organizationId: organization.id,
        createdById: user.id,
      });

      prisma.node.create.mockResolvedValue(mockNode);

      const result = await service.create(organization.id, user.id, {
        name: 'test-node',
      });

      expect(result.node).toBeDefined();
      expect(result.psk).toBeDefined();
      expect(result.psk).toContain('.');
      expect(prisma.node.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'test-node',
          organizationId: organization.id,
          createdById: user.id,
        }),
      });
    });

    it('should create a node with project assignment', async () => {
      const user = UserFactory.buildOnboarded();
      const organization = OrganizationFactory.build({ ownerId: user.id });
      const project = ProjectFactory.build({ organizationId: organization.id });
      const mockNode = NodeFactory.buildInactive({
        organizationId: organization.id,
        projectId: project.id,
        createdById: user.id,
      });

      projectsService.getProject.mockResolvedValue(project);
      prisma.node.create.mockResolvedValue(mockNode);

      const result = await service.create(organization.id, user.id, {
        name: 'test-node',
        projectId: project.id,
      });

      expect(result.node.projectId).toBe(project.id);
      expect(projectsService.getProject).toHaveBeenCalledWith(
        project.id,
        organization.id,
      );
    });

    it('should generate unique PSK for each node', async () => {
      const user = UserFactory.buildOnboarded();
      const organization = OrganizationFactory.build({ ownerId: user.id });

      prisma.node.create.mockResolvedValue(
        NodeFactory.buildInactive({ organizationId: organization.id }),
      );

      const result1 = await service.create(organization.id, user.id, {});
      const result2 = await service.create(organization.id, user.id, {});

      expect(result1.psk).not.toBe(result2.psk);
    });
  });

  describe('findAll', () => {
    it('should return paginated nodes', async () => {
      const organization = OrganizationFactory.build();
      const nodes = NodeFactory.buildMany(5, {
        organizationId: organization.id,
      });

      prisma.node.findMany.mockResolvedValue(nodes);
      prisma.node.count.mockResolvedValue(15);

      const result = await service.findAll(organization.id, {
        page: 1,
        limit: 5,
        sortBy: 'createdAt',
        order: 'desc',
      } as ListNodesQueryDto);

      expect(result.nodes).toHaveLength(5);
      expect(result.total).toBe(15);
      expect(prisma.node.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: organization.id },
          skip: 0,
          take: 5,
        }),
      );
    });

    it('should filter nodes by status', async () => {
      const organization = OrganizationFactory.build();
      const onlineNodes = NodeFactory.buildMany(3, {
        organizationId: organization.id,
        status: 'ONLINE',
      });

      prisma.node.findMany.mockResolvedValue(onlineNodes);
      prisma.node.count.mockResolvedValue(3);

      const result = await service.findAll(organization.id, {
        page: 1,
        limit: 10,
        status: 'ONLINE',
        sortBy: 'createdAt',
        order: 'desc',
      } as ListNodesQueryDto);

      expect(result.nodes).toHaveLength(3);
      expect(prisma.node.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ONLINE' }),
        }),
      );
    });

    it('should filter nodes by search term', async () => {
      const organization = OrganizationFactory.build();

      prisma.node.findMany.mockResolvedValue([]);
      prisma.node.count.mockResolvedValue(0);

      await service.findAll(organization.id, {
        page: 1,
        limit: 10,
        search: 'test-node',
        sortBy: 'createdAt',
        order: 'desc',
      } as ListNodesQueryDto);

      expect(prisma.node.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'test-node', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should filter nodes by project', async () => {
      const organization = OrganizationFactory.build();
      const project = ProjectFactory.build({ organizationId: organization.id });

      prisma.node.findMany.mockResolvedValue([]);
      prisma.node.count.mockResolvedValue(0);

      await service.findAll(organization.id, {
        page: 1,
        limit: 10,
        projectId: project.id,
        sortBy: 'createdAt',
        order: 'desc',
      } as ListNodesQueryDto);

      expect(prisma.node.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId: project.id }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return a node by ID', async () => {
      const organization = OrganizationFactory.build();
      const node = NodeFactory.build({ organizationId: organization.id });

      prisma.node.findFirst.mockResolvedValue(node);

      const result = await service.findById(organization.id, node.id);

      expect(result).toEqual(node);
      expect(prisma.node.findFirst).toHaveBeenCalledWith({
        where: {
          id: node.id,
          organizationId: organization.id,
        },
      });
    });

    it('should throw NotFoundException when node does not exist', async () => {
      const organization = OrganizationFactory.build();

      prisma.node.findFirst.mockResolvedValue(null);

      await expect(
        service.findById(organization.id, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not return node from different organization', async () => {
      const org2 = OrganizationFactory.build();

      prisma.node.findFirst.mockResolvedValue(null);

      await expect(service.findById(org2.id, 'some-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a node', async () => {
      const organization = OrganizationFactory.build();
      const node = NodeFactory.build({ organizationId: organization.id });
      const updatedNode = { ...node, name: 'updated-name' };

      prisma.node.findFirst.mockResolvedValue(node);
      prisma.node.update.mockResolvedValue(updatedNode);

      const result = await service.update(organization.id, node.id, {
        name: 'updated-name',
      });

      expect(result.name).toBe('updated-name');
      expect(prisma.node.update).toHaveBeenCalledWith({
        where: { id: node.id },
        data: expect.objectContaining({ name: 'updated-name' }),
      });
    });

    it('should validate project when updating projectId', async () => {
      const organization = OrganizationFactory.build();
      const project = ProjectFactory.build({ organizationId: organization.id });
      const node = NodeFactory.build({ organizationId: organization.id });

      prisma.node.findFirst.mockResolvedValue(node);
      projectsService.getProject.mockResolvedValue(project);
      prisma.node.update.mockResolvedValue({ ...node, projectId: project.id });

      await service.update(organization.id, node.id, {
        projectId: project.id,
      });

      expect(projectsService.getProject).toHaveBeenCalledWith(
        project.id,
        organization.id,
      );
    });
  });

  describe('remove', () => {
    it('should delete a node', async () => {
      const organization = OrganizationFactory.build();
      const node = NodeFactory.build({ organizationId: organization.id });

      prisma.node.findFirst.mockResolvedValue(node);
      prisma.node.delete.mockResolvedValue(node);

      await service.remove(organization.id, node.id);

      expect(prisma.node.delete).toHaveBeenCalledWith({
        where: { id: node.id },
      });
    });

    it('should throw NotFoundException when node does not exist', async () => {
      const organization = OrganizationFactory.build();

      prisma.node.findFirst.mockResolvedValue(null);

      await expect(
        service.remove(organization.id, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('bootstrap', () => {
    it('should bootstrap a node with certificate', async () => {
      const { psk, hash } = generatePSKWithHash();
      const organization = OrganizationFactory.build();
      const ca = OrganizationCAFactory.build({
        organizationId: organization.id,
      });
      const node = NodeFactory.buildInactive({
        id: hash,
        organizationId: organization.id,
      });

      const mockCsr =
        '-----BEGIN CERTIFICATE REQUEST-----\nMOCK\n-----END CERTIFICATE REQUEST-----';
      const mockPublicKey = 'mock-ec-public-key';
      const mockFlowerNodeId = '123456789';

      const nodeWithOrg: NodeWithOrganizationAndCA = {
        ...node,
        organization: {
          ...organization,
          ca,
        },
      };

      prisma.node.findFirst.mockResolvedValue(nodeWithOrg);
      trainingService.getActiveTrainingRunForNode.mockResolvedValue(
        'training-run-id',
      );
      flower.registerNode.mockResolvedValue(mockFlowerNodeId);
      nodeCertService.issueCertificate.mockResolvedValue({
        cert: {
          certificate:
            '-----BEGIN CERTIFICATE-----\nMOCK_CERT\n-----END CERTIFICATE-----',
          issuing_ca:
            '-----BEGIN CERTIFICATE-----\nMOCK_CA\n-----END CERTIFICATE-----',
          ca_chain: [],
          serial_number: 'aa:bb:cc:dd',
          expiration: Math.floor(Date.now() / 1000) + 31536000,
          private_key: '',
          private_key_type: '',
        },
        rootCa:
          '-----BEGIN CERTIFICATE-----\nROOT_CA\n-----END CERTIFICATE-----',
        mountPath: ca.vaultMountPath,
      });

      const result = await service.bootstrap(psk, mockCsr, mockPublicKey);

      expect(result.certificate).toBeDefined();
      expect(result.serialNumber).toBe('aa:bb:cc:dd');
      expect(result.rootCa).toBeDefined();
      expect(nodeCertService.issueCertificate).toHaveBeenCalledWith(
        nodeWithOrg,
        mockCsr,
      );
      expect(flower.registerNode).toHaveBeenCalledWith(
        mockPublicKey,
        'training-run-id',
      );
      expect(nodeCertService.create).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid PSK', async () => {
      prisma.node.findFirst.mockResolvedValue(null);

      await expect(
        service.bootstrap('invalid-psk', 'csr', 'publicKey'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException when organization has no CA', async () => {
      const { psk, hash } = generatePSKWithHash();
      const organization = OrganizationFactory.build();
      const node = NodeFactory.buildInactive({
        id: hash,
        organizationId: organization.id,
      });

      const nodeWithOrg: NodeWithOrganizationAndCA = {
        ...node,
        organization: {
          ...organization,
          ca: null,
        },
      };

      prisma.node.findFirst.mockResolvedValue(nodeWithOrg);
      nodeCertService.issueCertificate.mockRejectedValue(
        new NotFoundException({
          code: ErrorCode.ORG_CA_NOT_FOUND,
          message: 'Organization CA not found',
        }),
      );

      await expect(service.bootstrap(psk, 'csr', 'publicKey')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle PSK with organization prefix', async () => {
      const { psk, hash } = generatePSKWithHash();
      const organization = OrganizationFactory.build();
      const ca = OrganizationCAFactory.build({
        organizationId: organization.id,
      });
      const node = NodeFactory.buildInactive({
        id: hash,
        organizationId: organization.id,
      });

      const pskWithPrefix = `ORGPREFIX.${psk}`;

      const nodeWithOrg: NodeWithOrganizationAndCA = {
        ...node,
        organization: { ...organization, ca },
      };

      prisma.node.findFirst.mockResolvedValue(nodeWithOrg);
      trainingService.getActiveTrainingRunForNode.mockResolvedValue(null);
      nodeCertService.issueCertificate.mockResolvedValue({
        cert: {
          certificate: 'cert',
          issuing_ca: 'ca',
          ca_chain: [],
          serial_number: 'aa:bb',
          expiration: Date.now() / 1000 + 3600,
          private_key: '',
          private_key_type: '',
        },
        rootCa: 'root-ca',
        mountPath: ca.vaultMountPath,
      });

      await service.bootstrap(pskWithPrefix, 'csr', 'key');

      expect(prisma.node.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: hash,
          }),
        }),
      );
    });
  });

  describe('renewCertificate', () => {
    it('should renew a valid certificate', async () => {
      const organization = OrganizationFactory.build();
      const ca = OrganizationCAFactory.build({
        organizationId: organization.id,
      });
      const node = NodeFactory.buildOnline({
        organizationId: organization.id,
      });
      const certificate = NodeCertificateFactory.buildValid({
        nodeId: node.id,
      });

      const mockCsr =
        '-----BEGIN CERTIFICATE REQUEST-----\nMOCK\n-----END CERTIFICATE REQUEST-----';

      const certWithNode: CertificateWithNode = {
        ...certificate,
        node: {
          ...node,
          organization: { ...organization, ca },
        },
      };

      nodeCertService.findOne.mockResolvedValue(certWithNode);
      nodeCertService.issueCertificate.mockResolvedValue({
        cert: {
          certificate:
            '-----BEGIN CERTIFICATE-----\nNEW_CERT\n-----END CERTIFICATE-----',
          issuing_ca:
            '-----BEGIN CERTIFICATE-----\nCA\n-----END CERTIFICATE-----',
          ca_chain: [],
          serial_number: 'new:serial',
          expiration: Math.floor(Date.now() / 1000) + 31536000,
          private_key: '',
          private_key_type: '',
        },
        rootCa: 'root-ca',
        mountPath: ca.vaultMountPath,
      });

      const result = await service.renewCertificate(
        certificate.serialNumber,
        mockCsr,
      );

      expect(result.certificate).toContain('NEW_CERT');
      expect(result.serialNumber).toBe('new:serial');
      expect(nodeCertService.revokeCertificate).toHaveBeenCalledWith(
        ca.vaultMountPath,
        certificate.serialNumber,
      );
      expect(nodeCertService.update).toHaveBeenCalled();
      expect(nodeCertService.create).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for expired certificate', async () => {
      const organization = OrganizationFactory.build();
      const ca = OrganizationCAFactory.build({
        organizationId: organization.id,
      });
      const node = NodeFactory.build({ organizationId: organization.id });
      const expiredCert = NodeCertificateFactory.buildExpired({
        nodeId: node.id,
      });

      const certWithNode: CertificateWithNode = {
        ...expiredCert,
        node: {
          ...node,
          organization: { ...organization, ca },
        },
      };

      nodeCertService.findOne.mockResolvedValue(certWithNode);

      await expect(
        service.renewCertificate(expiredCert.serialNumber, 'csr'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException when organization has no CA', async () => {
      const organization = OrganizationFactory.build();
      const node = NodeFactory.build({ organizationId: organization.id });
      const certificate = NodeCertificateFactory.buildValid({
        nodeId: node.id,
      });

      const certWithNode: CertificateWithNode = {
        ...certificate,
        node: {
          ...node,
          organization: { ...organization, ca: null },
        },
      };

      nodeCertService.findOne.mockResolvedValue(certWithNode);
      nodeCertService.issueCertificate.mockRejectedValue(
        new NotFoundException({
          code: ErrorCode.ORG_CA_NOT_FOUND,
          message: 'Organization CA not found',
        }),
      );

      await expect(
        service.renewCertificate(certificate.serialNumber, 'csr'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
