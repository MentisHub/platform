import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '@platform/contracts';
import type { Fab } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { SupabaseService } from '../supabase/supabase.service';
import type { UploadDefaultFabInput, UploadFabInput } from './fabs.interface';
import {
  buildDefaultFabStoragePath,
  buildFabAccessFilter,
  buildFabStoragePath,
  extractFabMetadataFromFilename,
} from './fabs.utils';

@Injectable()
export class FabsService {
  private readonly logger: Logger = new Logger(FabsService.name);
  private readonly storageBucket = 'fab';

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly projectsService: ProjectsService,
  ) {}

  async uploadFab(input: UploadFabInput): Promise<Fab> {
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

    const metadata = extractFabMetadataFromFilename(input.originalname);
    const existingFab = await this.prisma.fab.findFirst({
      where: {
        fabHash: metadata.fabHash,
        OR: [{ organizationId: input.organizationId }, { isDefault: true }],
      },
    });

    if (existingFab) {
      throw new BadRequestException({
        code: ErrorCode.FAB_ALREADY_EXISTS,
        message: 'FAB with this hash already exists',
      });
    }

    const storagePath = buildFabStoragePath(
      input.organizationId,
      metadata.fabHash,
      metadata.version,
      input.projectId,
    );

    try {
      await this.supabase.uploadFile(
        this.storageBucket,
        storagePath,
        input.fileBuffer,
      );
    } catch (error) {
      this.logger.error(
        {
          action: 'fab.upload',
          organizationId: input.organizationId,
          projectId: input.projectId,
          storagePath,
          fabHash: metadata.fabHash,
          version: metadata.version,
          err: error instanceof Error ? error : new Error(String(error)),
          issue: 'storage_upload_failed',
        },
        'Failed to upload FAB to storage',
      );
      throw error;
    }

    const fab = await this.prisma.fab.create({
      data: {
        name: metadata.name,
        publisherName: metadata.publisherName,
        description: input.description,
        fabHash: metadata.fabHash,
        version: metadata.version,
        storagePath,
        sizeBytes: BigInt(input.size),
        isDefault: false,
        isPublic: input.isPublic ?? false,
        tags: input.tags ?? [],
        organizationId: input.organizationId,
        projectId: input.projectId ?? null,
        uploadedBy: input.userId,
      },
    });

    return fab;
  }

  async uploadDefaultFab(input: UploadDefaultFabInput): Promise<Fab> {
    const metadata = extractFabMetadataFromFilename(input.originalname);
    const existingFab = await this.prisma.fab.findFirst({
      where: { fabHash: metadata.fabHash, AND: [{ isDefault: true }] },
    });

    if (existingFab) {
      throw new BadRequestException({
        code: ErrorCode.FAB_ALREADY_EXISTS,
        message: 'FAB with this hash already exists',
      });
    }

    const storagePath = buildDefaultFabStoragePath(
      metadata.fabHash,
      metadata.version,
    );

    try {
      await this.supabase.uploadFile(
        this.storageBucket,
        storagePath,
        input.fileBuffer,
      );
    } catch (error) {
      this.logger.error(
        {
          action: 'fab.upload_default',
          storagePath,
          fabHash: metadata.fabHash,
          version: metadata.version,
          err: error instanceof Error ? error : new Error(String(error)),
          issue: 'storage_upload_failed',
        },
        'Failed to upload default FAB to storage',
      );
      throw error;
    }

    const fab = await this.prisma.fab.create({
      data: {
        name: metadata.name,
        publisherName: metadata.publisherName,
        description: input.description,
        fabHash: metadata.fabHash,
        version: metadata.version,
        storagePath,
        sizeBytes: BigInt(input.size),
        isDefault: true,
        isPublic: input.isPublic ?? true,
        tags: input.tags ?? [],
        organizationId: null,
        projectId: null,
        uploadedBy: input.userId,
      },
    });

    this.logger.log(
      {
        action: 'fab.default_uploaded',
        fabId: fab.id,
        fabHash: fab.fabHash,
        publisherName: fab.publisherName,
        name: fab.name,
        version: fab.version,
        sizeBytes: Number(fab.sizeBytes),
        userId: input.userId,
      },
      'Default FAB uploaded successfully',
    );

    return fab;
  }

  async listFabs(
    organizationId: string,
    projectId?: string,
    tags?: string[],
  ): Promise<Fab[]> {
    return this.prisma.fab.findMany({
      where: {
        OR: buildFabAccessFilter(organizationId, projectId),
        ...(tags && tags.length > 0 ? { tags: { hasSome: tags } } : {}),
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getFab(fabId: string, organizationId: string): Promise<Fab> {
    const fab = await this.prisma.fab.findFirst({
      where: {
        id: fabId,
        OR: buildFabAccessFilter(organizationId),
      },
    });

    if (!fab) {
      throw new NotFoundException({
        code: ErrorCode.FAB_NOT_FOUND,
        message: 'FAB not found or access denied',
      });
    }

    return fab;
  }

  async getFabById(fabId: string): Promise<Fab> {
    const fab = await this.prisma.fab.findUnique({
      where: { id: fabId },
    });

    if (!fab) {
      throw new NotFoundException({
        code: ErrorCode.FAB_NOT_FOUND,
        message: 'FAB not found',
      });
    }

    return fab;
  }

  async downloadFabById(fabId: string): Promise<Buffer> {
    const fab = await this.getFabById(fabId);
    try {
      return await this.supabase.downloadFile(
        this.storageBucket,
        fab.storagePath,
      );
    } catch (error) {
      this.logger.error(
        {
          action: 'fab.download',
          fabId,
          storagePath: fab.storagePath,
          err: error instanceof Error ? error : new Error(String(error)),
          issue: 'storage_download_failed',
        },
        'Failed to download FAB from storage',
      );
      throw error;
    }
  }

  async downloadFab(fabId: string, organizationId: string): Promise<Buffer> {
    const fab = await this.getFab(fabId, organizationId);
    try {
      return await this.supabase.downloadFile(
        this.storageBucket,
        fab.storagePath,
      );
    } catch (error) {
      this.logger.error(
        {
          action: 'fab.download',
          fabId,
          organizationId,
          storagePath: fab.storagePath,
          err: error instanceof Error ? error : new Error(String(error)),
          issue: 'storage_download_failed',
        },
        'Failed to download FAB from storage',
      );
      throw error;
    }
  }
}
