import { faker } from '@faker-js/faker';
import * as crypto from 'crypto';
import type { Fab } from '@prisma/client';

export type FabFactoryInput = Partial<Fab>;

/**
 * Factory for creating Fab (Federated Application Bundle) entities
 *
 * @example
 * // Create a FAB with defaults
 * const fab = FabFactory.build();
 *
 * // Create a public FAB
 * const fab = FabFactory.buildPublic();
 *
 * // Create a default FAB
 * const fab = FabFactory.buildDefault();
 */
export const FabFactory = {
  /**
   * Build a single Fab object (not persisted)
   */
  build(overrides: FabFactoryInput = {}): Fab {
    const now = new Date();
    const hash = crypto.randomBytes(32).toString('hex');
    const orgId = overrides.organizationId || faker.string.uuid();

    return {
      id: faker.string.uuid(),
      name: `${faker.word.adjective()}-${faker.word.noun()}-fab`,
      description: faker.lorem.sentence(),
      fabHash: hash,
      publisherName: faker.word.adjective(),
      version: `${faker.number.int({ min: 1, max: 9 })}.${faker.number.int({ min: 0, max: 9 })}.${faker.number.int({ min: 0, max: 9 })}`,
      storagePath: `orgs/${orgId}/fabs/${hash}`,
      storageBucket: 'fab',
      sizeBytes: BigInt(faker.number.int({ min: 100_000, max: 50_000_000 })),
      isDefault: false,
      isPublic: false,
      organizationId: orgId,
      projectId: null,
      uploadedById: faker.string.uuid(),
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  },

  /**
   * Build multiple Fab objects
   */
  buildMany(count: number, overrides: FabFactoryInput = {}): Fab[] {
    return Array.from({ length: count }, () => FabFactory.build(overrides));
  },

  /**
   * Build a public FAB (available to all)
   */
  buildPublic(overrides: FabFactoryInput = {}): Fab {
    return this.build({
      isPublic: true,
      isDefault: false,
      organizationId: null,
      projectId: null,
      ...overrides,
    });
  },

  /**
   * Build a default FAB
   */
  buildDefault(overrides: FabFactoryInput = {}): Fab {
    return this.build({
      isDefault: true,
      isPublic: true,
      organizationId: null,
      projectId: null,
      name: 'Default FAB',
      ...overrides,
    });
  },

  /**
   * Build an organization-scoped FAB
   */
  buildForOrganization(
    organizationId: string,
    overrides: FabFactoryInput = {},
  ): Fab {
    const hash = crypto.randomBytes(32).toString('hex');
    return this.build({
      organizationId,
      isPublic: false,
      isDefault: false,
      projectId: null,
      storagePath: `orgs/${organizationId}/fabs/${hash}`,
      fabHash: hash,
      ...overrides,
    });
  },

  /**
   * Build a project-scoped FAB
   */
  buildForProject(
    organizationId: string,
    projectId: string,
    overrides: FabFactoryInput = {},
  ): Fab {
    const hash = crypto.randomBytes(32).toString('hex');
    return this.build({
      organizationId,
      projectId,
      isPublic: false,
      isDefault: false,
      storagePath: `orgs/${organizationId}/projects/${projectId}/fabs/${hash}`,
      fabHash: hash,
      ...overrides,
    });
  },

  /**
   * Build a FAB with specific hash (useful for testing downloads)
   */
  buildWithHash(hash: string, overrides: FabFactoryInput = {}): Fab {
    return this.build({
      fabHash: hash,
      ...overrides,
    });
  },
};

/**
 * Generate mock FAB content
 */
export const generateMockFabContent = (sizeBytes: number = 1024): Buffer => {
  return crypto.randomBytes(sizeBytes);
};

/**
 * Generate a valid FAB hash
 */
export const generateFabHash = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Build a complete FAB setup (org + owner + fab)
 */
export const buildFabSetup = (
  overrides: {
    fab?: FabFactoryInput;
    isDefault?: boolean;
    isPublic?: boolean;
  } = {},
) => {
  // Import here to avoid circular dependencies

  const { buildOrganizationSetup } =
    require('./organization.factory') as typeof import('./organization.factory');
  const { owner, organization, ca } = buildOrganizationSetup();

  let fab: Fab;

  if (overrides.isDefault) {
    fab = FabFactory.buildDefault({
      uploadedById: owner.id,
      ...overrides.fab,
    });
  } else if (overrides.isPublic) {
    fab = FabFactory.buildPublic({
      uploadedById: owner.id,
      ...overrides.fab,
    });
  } else {
    fab = FabFactory.buildForOrganization(organization.id, {
      uploadedById: owner.id,
      ...overrides.fab,
    });
  }

  return { owner, organization, ca, fab };
};
