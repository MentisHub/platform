import { faker } from '@faker-js/faker';
import type { User } from '@prisma/client';

export type UserFactoryInput = Partial<User>;

/**
 * Factory for creating User entities
 *
 * @example
 * // Create a user with defaults
 * const user = UserFactory.build();
 *
 * // Create a user with specific values
 * const user = UserFactory.build({ email: 'test@example.com' });
 *
 * // Create multiple users
 * const users = UserFactory.buildMany(5);
 */
export const UserFactory = {
  /**
   * Build a single User object (not persisted)
   */
  build(overrides: UserFactoryInput = {}): User {
    const now = new Date();

    return {
      id: faker.string.uuid(),
      email: faker.internet.email().toLowerCase(),
      name: faker.person.fullName(),
      isOnboardingComplete: faker.datatype.boolean(),
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  },

  /**
   * Build multiple User objects
   */
  buildMany(count: number, overrides: UserFactoryInput = {}): User[] {
    return Array.from({ length: count }, () => this.build(overrides));
  },

  /**
   * Build a user who has completed onboarding
   */
  buildOnboarded(overrides: UserFactoryInput = {}): User {
    return this.build({
      isOnboardingComplete: true,
      ...overrides,
    });
  },

  /**
   * Build a new user (not onboarded)
   */
  buildNew(overrides: UserFactoryInput = {}): User {
    return this.build({
      isOnboardingComplete: false,
      ...overrides,
    });
  },
};

/**
 * Create user data suitable for JWT payload
 */
export const createUserJwtPayload = (user?: User) => {
  const u = user || UserFactory.build();
  return {
    sub: u.id,
    email: u.email,
    aud: 'authenticated',
    role: 'authenticated',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  };
};
