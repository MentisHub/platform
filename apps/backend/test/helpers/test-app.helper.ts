import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import { INestApplication, ModuleMetadata, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { VaultService } from 'src/vault/vault.service';
import { SupabaseService } from 'src/supabase/supabase.service';
import { DockerService } from 'src/docker/docker.service';
import { FlowerService } from 'src/flower/flower.service';
import {
  createMockPrismaService,
  createMockVaultService,
  createMockSupabaseService,
  createMockDockerService,
  createMockFlowerService,
  createMockConfigService,
  MockPrismaService,
  MockVaultService,
  MockSupabaseService,
  MockDockerService,
  MockFlowerService,
} from '../mocks';

/**
 * Test context containing all mocked services
 */
export interface TestContext {
  module: TestingModule;
  prisma: MockPrismaService;
  vault: MockVaultService;
  supabase: MockSupabaseService;
  docker: MockDockerService;
  flower: MockFlowerService;
  config: ReturnType<typeof createMockConfigService>;
}

/**
 * Options for creating a test module
 */
export interface CreateTestModuleOptions {
  /** The service or controller to test */
  target: Type<any>;
  /** Additional providers to include */
  providers?: ModuleMetadata['providers'];
  /** Additional imports to include */
  imports?: ModuleMetadata['imports'];
  /** Custom mock overrides */
  mockOverrides?: {
    prisma?: Partial<MockPrismaService>;
    vault?: Partial<MockVaultService>;
    supabase?: Partial<MockSupabaseService>;
    docker?: Partial<MockDockerService>;
    flower?: Partial<MockFlowerService>;
    config?: Record<string, any>;
  };
  /** Whether to include Prisma mock (default: true) */
  includePrisma?: boolean;
  /** Whether to include Vault mock (default: false) */
  includeVault?: boolean;
  /** Whether to include Supabase mock (default: false) */
  includeSupabase?: boolean;
  /** Whether to include Docker mock (default: false) */
  includeDocker?: boolean;
  /** Whether to include Flower mock (default: false) */
  includeFlower?: boolean;
}

/**
 * Create a test module with mocked dependencies
 *
 * @example
 * describe('NodesService', () => {
 *   let service: NodesService;
 *   let ctx: TestContext;
 *
 *   beforeEach(async () => {
 *     ctx = await createTestModule({
 *       target: NodesService,
 *       includeVault: true,
 *       includeFlower: true,
 *     });
 *     service = ctx.module.get<NodesService>(NodesService);
 *   });
 *
 *   it('should create a node', async () => {
 *     ctx.prisma.node.create.mockResolvedValue(mockNode);
 *     const result = await service.create(createDto);
 *     expect(result).toEqual(mockNode);
 *   });
 * });
 */
export async function createTestModule(
  options: CreateTestModuleOptions,
): Promise<TestContext> {
  const {
    target,
    providers = [],
    imports = [],
    mockOverrides = {},
    includePrisma = true,
    includeVault = false,
    includeSupabase = false,
    includeDocker = false,
    includeFlower = false,
  } = options;

  // Create mocks
  const prisma = createMockPrismaService();
  const vault = createMockVaultService();
  const supabase = createMockSupabaseService();
  const docker = createMockDockerService();
  const flower = createMockFlowerService();
  const config = createMockConfigService(mockOverrides.config);

  // Build providers array
  const mockProviders: ModuleMetadata['providers'] = [
    target,
    { provide: ConfigService, useValue: config },
    ...providers,
  ];

  if (includePrisma) {
    mockProviders.push({ provide: PrismaService, useValue: prisma });
  }

  if (includeVault) {
    mockProviders.push({ provide: VaultService, useValue: vault });
  }

  if (includeSupabase) {
    mockProviders.push({ provide: SupabaseService, useValue: supabase });
  }

  if (includeDocker) {
    mockProviders.push({ provide: DockerService, useValue: docker });
  }

  if (includeFlower) {
    mockProviders.push({ provide: FlowerService, useValue: flower });
  }

  // Create module
  const module = await Test.createTestingModule({
    imports,
    providers: mockProviders,
  }).compile();

  return {
    module,
    prisma,
    vault,
    supabase,
    docker,
    flower,
    config,
  };
}

/**
 * Create a test module builder for more control
 *
 * @example
 * const builder = createTestModuleBuilder(NodesService)
 *   .overrideProvider(SomeService)
 *   .useValue(mockValue);
 *
 * const module = await builder.compile();
 */
export function createTestModuleBuilder(
  target: Type<any>,
  providers: ModuleMetadata['providers'] = [],
): TestingModuleBuilder {
  const prisma = createMockPrismaService();
  const config = createMockConfigService();

  return Test.createTestingModule({
    providers: [
      target,
      { provide: PrismaService, useValue: prisma },
      { provide: ConfigService, useValue: config },
      ...providers,
    ],
  });
}

/**
 * Create and initialize a full NestJS application for E2E tests
 *
 * @example
 * describe('Nodes (e2e)', () => {
 *   let app: INestApplication;
 *
 *   beforeAll(async () => {
 *     app = await createTestApp(AppModule);
 *   });
 *
 *   afterAll(async () => {
 *     await app.close();
 *   });
 * });
 */
export async function createTestApp(
  moduleClass: Type<any>,
): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [moduleClass],
  }).compile();

  const app = moduleFixture.createNestApplication();
  await app.init();

  return app;
}

/**
 * Helper to get a service from test context
 */
export function getService<T>(ctx: TestContext, service: Type<T>): T {
  return ctx.module.get<T>(service);
}
