import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VaultService } from './vault.service';
import { createMockConfigService } from '../../test/mocks';

describe('VaultService', () => {
  let service: VaultService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VaultService,
        { provide: ConfigService, useValue: createMockConfigService() },
      ],
    }).compile();

    service = module.get<VaultService>(VaultService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have pki API', () => {
    expect(service.pki).toBeDefined();
  });

  it('should have auth API', () => {
    expect(service.auth).toBeDefined();
  });
});
