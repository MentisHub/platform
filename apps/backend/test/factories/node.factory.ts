import { faker } from '@faker-js/faker';
import type { Node, NodeCertificate, NodeStatus } from '@prisma/client';
import { generatePSKWithHash } from 'src/utils';

export type NodeFactoryInput = Partial<Node>;
export type NodeCertificateFactoryInput = Partial<NodeCertificate>;

/**
 * Factory for creating Node entities
 *
 * @example
 * // Create a node with defaults
 * const node = NodeFactory.build();
 *
 * // Create with specific organization
 * const node = NodeFactory.build({ organizationId: org.id });
 *
 * // Create an active node
 * const node = NodeFactory.buildOnline({ organizationId: org.id });
 */
export const NodeFactory = {
  /**
   * Build a single Node object (not persisted)
   * Note: The ID is a PSK hash, not a UUID
   */
  build(overrides: NodeFactoryInput = {}): Node {
    const now = new Date();
    const { hash } = generatePSKWithHash();
    const statuses: NodeStatus[] = ['ONLINE', 'OFFLINE', 'INACTIVE'];

    return {
      id: hash, // PSK hash
      name: `node-${faker.string.alphanumeric(8)}`,
      status: faker.helpers.arrayElement(statuses),
      metadata: {
        cpu: faker.number.int({ min: 2, max: 32 }),
        memory: `${faker.number.int({ min: 4, max: 128 })}GB`,
        gpu: faker.helpers.arrayElement([
          null,
          'NVIDIA RTX 3090',
          'NVIDIA A100',
          'NVIDIA V100',
        ]),
        region: faker.location.country(),
      },
      organizationId: faker.string.uuid(),
      projectId: null,
      createdById: faker.string.uuid(),
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  },

  /**
   * Build multiple Node objects
   */
  buildMany(count: number, overrides: NodeFactoryInput = {}): Node[] {
    return Array.from({ length: count }, () => this.build(overrides));
  },

  /**
   * Build a node with its PSK (pre-shared key)
   * Returns both the node and the plaintext PSK for testing bootstrap flow
   */
  buildWithPSK(overrides: NodeFactoryInput = {}): { node: Node; psk: string } {
    const { psk, hash } = generatePSKWithHash();
    const node = this.build({ id: hash, ...overrides });
    return { node, psk };
  },

  /**
   * Build an online node
   */
  buildOnline(overrides: NodeFactoryInput = {}): Node {
    return this.build({ status: 'ONLINE', ...overrides });
  },

  /**
   * Build an offline node
   */
  buildOffline(overrides: NodeFactoryInput = {}): Node {
    return this.build({ status: 'OFFLINE', ...overrides });
  },

  /**
   * Build an inactive node (not yet bootstrapped)
   */
  buildInactive(overrides: NodeFactoryInput = {}): Node {
    return this.build({ status: 'INACTIVE', ...overrides });
  },

  /**
   * Build a node assigned to a project
   */
  buildWithProject(projectId: string, overrides: NodeFactoryInput = {}): Node {
    return this.build({ projectId, ...overrides });
  },

  /**
   * Build a node with Flower metadata
   */
  buildWithFlowerMetadata(
    flowerNodeId: string,
    overrides: NodeFactoryInput = {},
  ): Node {
    const baseNode = this.build(overrides);
    return {
      ...baseNode,
      metadata: {
        ...(baseNode.metadata as Record<string, any>),
        flowerNodeId,
      },
    };
  },
};

/**
 * Factory for creating NodeCertificate entities
 */
export const NodeCertificateFactory = {
  /**
   * Build a single NodeCertificate object
   */
  build(overrides: NodeCertificateFactoryInput = {}): NodeCertificate {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

    return {
      nodeId: overrides.nodeId || generatePSKWithHash().hash,
      serialNumber: generateSerialNumber(),
      issuedAt: now,
      expiresAt,
      revokedAt: null,
      ...overrides,
    };
  },

  /**
   * Build multiple NodeCertificate objects
   */
  buildMany(
    count: number,
    overrides: NodeCertificateFactoryInput = {},
  ): NodeCertificate[] {
    return Array.from({ length: count }, () => this.build(overrides));
  },

  /**
   * Build a valid certificate (not expired, not revoked)
   */
  buildValid(overrides: NodeCertificateFactoryInput = {}): NodeCertificate {
    const now = new Date();
    return this.build({
      issuedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
      expiresAt: new Date(now.getTime() + 364 * 24 * 60 * 60 * 1000), // ~1 year from now
      revokedAt: null,
      ...overrides,
    });
  },

  /**
   * Build an expired certificate
   */
  buildExpired(overrides: NodeCertificateFactoryInput = {}): NodeCertificate {
    const now = new Date();
    return this.build({
      issuedAt: new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000), // 400 days ago
      expiresAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000), // 35 days ago
      revokedAt: null,
      ...overrides,
    });
  },

  /**
   * Build a revoked certificate
   */
  buildRevoked(overrides: NodeCertificateFactoryInput = {}): NodeCertificate {
    const now = new Date();
    return this.build({
      revokedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
      ...overrides,
    });
  },
};

/**
 * Generate a realistic certificate serial number
 */
export const generateSerialNumber = (): string => {
  const bytes = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0'),
  );
  return bytes.join(':');
};

/**
 * Build a complete node setup (org + owner + node + certificate)
 */
export const buildNodeSetup = (
  overrides: {
    node?: NodeFactoryInput;
    certificate?: NodeCertificateFactoryInput;
  } = {},
) => {
  const { psk, hash } = generatePSKWithHash();

  // Import here to avoid circular dependencies

  const { buildOrganizationSetup } =
    require('./organization.factory') as typeof import('./organization.factory');
  const { owner, organization, ca } = buildOrganizationSetup();

  const node = NodeFactory.build({
    id: hash,
    organizationId: organization.id,
    createdById: owner.id,
    ...overrides.node,
  });

  const certificate = NodeCertificateFactory.buildValid({
    nodeId: node.id,
    ...overrides.certificate,
  });

  return { owner, organization, ca, node, certificate, psk };
};
