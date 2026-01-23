import { faker } from '@faker-js/faker';
import type {
  Organization,
  OrganizationMember,
  OrganizationCA,
  OrgRole,
} from '@prisma/client';
import { UserFactory } from './user.factory';

export type OrganizationFactoryInput = Partial<Organization>;
export type OrganizationMemberFactoryInput = Partial<OrganizationMember>;
export type OrganizationCAFactoryInput = Partial<OrganizationCA>;

/**
 * Factory for creating Organization entities
 *
 * @example
 * // Create an organization with defaults
 * const org = OrganizationFactory.build();
 *
 * // Create with a specific owner
 * const org = OrganizationFactory.build({ ownerId: user.id });
 *
 * // Create multiple organizations
 * const orgs = OrganizationFactory.buildMany(3);
 */
export const OrganizationFactory = {
  /**
   * Build a single Organization object (not persisted)
   */
  build(overrides: OrganizationFactoryInput = {}): Organization {
    const now = new Date();

    return {
      id: faker.string.uuid(),
      name: faker.company.name(),
      ownerId: faker.string.uuid(),
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  },

  /**
   * Build multiple Organization objects
   */
  buildMany(
    count: number,
    overrides: OrganizationFactoryInput = {},
  ): Organization[] {
    return Array.from({ length: count }, () => this.build(overrides));
  },

  /**
   * Build an organization with its owner user
   */
  buildWithOwner(overrides: OrganizationFactoryInput = {}) {
    const owner = UserFactory.buildOnboarded();
    const organization = this.build({ ownerId: owner.id, ...overrides });
    return { organization, owner };
  },
};

/**
 * Factory for creating OrganizationMember entities
 */
export const OrganizationMemberFactory = {
  /**
   * Build a single OrganizationMember object
   */
  build(overrides: OrganizationMemberFactoryInput = {}): OrganizationMember {
    const roles: OrgRole[] = ['ADMIN', 'MEMBER'];

    return {
      organizationId: faker.string.uuid(),
      userId: faker.string.uuid(),
      role: faker.helpers.arrayElement(roles),
      joinedAt: new Date(),
      ...overrides,
    };
  },

  /**
   * Build multiple OrganizationMember objects
   */
  buildMany(
    count: number,
    overrides: OrganizationMemberFactoryInput = {},
  ): OrganizationMember[] {
    return Array.from({ length: count }, () => this.build(overrides));
  },

  /**
   * Build an admin member
   */
  buildAdmin(
    overrides: OrganizationMemberFactoryInput = {},
  ): OrganizationMember {
    return this.build({ role: 'ADMIN', ...overrides });
  },

  /**
   * Build a regular member
   */
  buildMember(
    overrides: OrganizationMemberFactoryInput = {},
  ): OrganizationMember {
    return this.build({ role: 'MEMBER', ...overrides });
  },
};

/**
 * Factory for creating OrganizationCA entities
 */
export const OrganizationCAFactory = {
  /**
   * Build a single OrganizationCA object
   */
  build(overrides: OrganizationCAFactoryInput = {}): OrganizationCA {
    const orgId = overrides.organizationId || faker.string.uuid();

    return {
      id: faker.string.uuid(),
      organizationId: orgId,
      vaultMountPath: `pki-org-${orgId.slice(0, 8)}`,
      createdAt: new Date(),
      ...overrides,
    };
  },

  /**
   * Build multiple OrganizationCA objects
   */
  buildMany(
    count: number,
    overrides: OrganizationCAFactoryInput = {},
  ): OrganizationCA[] {
    return Array.from({ length: count }, () => this.build(overrides));
  },
};

/**
 * Build a complete organization setup (org + owner + CA)
 */
export const buildOrganizationSetup = (
  overrides: {
    organization?: OrganizationFactoryInput;
    ca?: OrganizationCAFactoryInput;
  } = {},
) => {
  const owner = UserFactory.buildOnboarded();
  const organization = OrganizationFactory.build({
    ownerId: owner.id,
    ...overrides.organization,
  });
  const ca = OrganizationCAFactory.build({
    organizationId: organization.id,
    ...overrides.ca,
  });

  return { owner, organization, ca };
};
