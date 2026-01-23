import { faker } from '@faker-js/faker';
import type {
  Project,
  ProjectCollaborator,
  ProjectMember,
  ProjectRole,
} from '@prisma/client';
import {
  OrganizationFactory,
  OrganizationCAFactory,
} from './organization.factory';
import { UserFactory } from './user.factory';

export type ProjectFactoryInput = Partial<Project>;
export type ProjectCollaboratorFactoryInput = Partial<ProjectCollaborator>;
export type ProjectMemberFactoryInput = Partial<ProjectMember>;

/**
 * Factory for creating Project entities
 *
 * @example
 * // Create a project with defaults
 * const project = ProjectFactory.build();
 *
 * // Create with specific organization
 * const project = ProjectFactory.build({ organizationId: org.id });
 */
export const ProjectFactory = {
  /**
   * Build a single Project object (not persisted)
   */
  build(overrides: ProjectFactoryInput = {}): Project {
    const now = new Date();

    return {
      id: faker.string.uuid(),
      name: `${faker.word.adjective()}-${faker.word.noun()}`,
      organizationId: faker.string.uuid(),
      trainingConfig: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  },

  /**
   * Build multiple Project objects
   */
  buildMany(count: number, overrides: ProjectFactoryInput = {}): Project[] {
    return Array.from({ length: count }, () => this.build(overrides));
  },

  /**
   * Build a project with training configuration
   */
  buildWithConfig(
    config: Record<string, any>,
    overrides: ProjectFactoryInput = {},
  ): Project {
    return this.build({
      trainingConfig: config,
      ...overrides,
    });
  },
};

/**
 * Factory for creating ProjectCollaborator entities
 */
export const ProjectCollaboratorFactory = {
  /**
   * Build a single ProjectCollaborator object
   */
  build(overrides: ProjectCollaboratorFactoryInput = {}): ProjectCollaborator {
    return {
      projectId: faker.string.uuid(),
      organizationId: faker.string.uuid(),
      invitedBy: faker.string.uuid(),
      invitedAt: new Date(),
      acceptedAt: null,
      ...overrides,
    };
  },

  /**
   * Build multiple ProjectCollaborator objects
   */
  buildMany(
    count: number,
    overrides: ProjectCollaboratorFactoryInput = {},
  ): ProjectCollaborator[] {
    return Array.from({ length: count }, () => this.build(overrides));
  },

  /**
   * Build an accepted collaborator
   */
  buildAccepted(
    overrides: ProjectCollaboratorFactoryInput = {},
  ): ProjectCollaborator {
    return this.build({
      acceptedAt: faker.date.recent(),
      ...overrides,
    });
  },

  /**
   * Build a pending collaborator (invitation not accepted)
   */
  buildPending(
    overrides: ProjectCollaboratorFactoryInput = {},
  ): ProjectCollaborator {
    return this.build({
      acceptedAt: null,
      ...overrides,
    });
  },
};

/**
 * Factory for creating ProjectMember entities
 */
export const ProjectMemberFactory = {
  /**
   * Build a single ProjectMember object
   */
  build(overrides: ProjectMemberFactoryInput = {}): ProjectMember {
    const roles: ProjectRole[] = ['ADMIN', 'MEMBER'];

    return {
      projectId: faker.string.uuid(),
      userId: faker.string.uuid(),
      invitedBy: faker.string.uuid(),
      invitedAt: new Date(),
      role: faker.helpers.arrayElement(roles),
      ...overrides,
    };
  },

  /**
   * Build multiple ProjectMember objects
   */
  buildMany(
    count: number,
    overrides: ProjectMemberFactoryInput = {},
  ): ProjectMember[] {
    return Array.from({ length: count }, () => this.build(overrides));
  },

  /**
   * Build a project admin
   */
  buildAdmin(overrides: ProjectMemberFactoryInput = {}): ProjectMember {
    return this.build({ role: 'ADMIN', ...overrides });
  },

  /**
   * Build a regular project member
   */
  buildMember(overrides: ProjectMemberFactoryInput = {}): ProjectMember {
    return this.build({ role: 'MEMBER', ...overrides });
  },
};

/**
 * Build a complete project setup (org + owner + project + CA)
 */
export const buildProjectSetup = (
  overrides: {
    project?: ProjectFactoryInput;
  } = {},
) => {
  const owner = UserFactory.buildOnboarded();
  const organization = OrganizationFactory.build({ ownerId: owner.id });
  const ca = OrganizationCAFactory.build({ organizationId: organization.id });
  const project = ProjectFactory.build({
    organizationId: organization.id,
    ...overrides.project,
  });

  return { owner, organization, ca, project };
};
