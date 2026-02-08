import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ErrorCode } from '@platform/contracts';
import type { Fab } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { SupabaseService } from '../supabase/supabase.service';
import { RunParticipantService } from '../training/services/run-participant.service';
import type { UploadDefaultFabDto, UploadFabDto } from './fabs.dto';
import { FabPackage } from './fabs.interface';
import {
  buildDefaultFabStoragePath,
  buildFabAccessFilter,
  buildFabStoragePath,
  extractFabMetadataFromFilename,
} from './fabs.utils';

@Injectable()
export class FabsService {
  private readonly storageBucket = 'fab';

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly projectsService: ProjectsService,
    @Inject(forwardRef(() => RunParticipantService))
    private readonly runParticipantService: RunParticipantService,
  ) {}

  async uploadFab(
    organizationId: string,
    userId: string,
    dto: UploadFabDto,
    file: Express.Multer.File,
  ): Promise<Fab> {
    if (dto.projectId) {
      const project = await this.projectsService.getProjectById(dto.projectId);
      if (project.organizationId !== organizationId) {
        throw new NotFoundException({
          code: ErrorCode.PROJECT_NOT_FOUND,
          message: 'Project not found',
        });
      }
    }

    const metadata = extractFabMetadataFromFilename(file.originalname);
    const existingFab = await this.prisma.fab.findFirst({
      where: { fabHash: metadata.fabHash },
    });

    if (existingFab) {
      throw new BadRequestException({
        code: ErrorCode.FAB_ALREADY_EXISTS,
        message: 'FAB with this hash already exists',
      });
    }

    const storagePath = buildFabStoragePath(
      organizationId,
      metadata.fabHash,
      metadata.version,
      dto.projectId,
    );

    await this.supabase.uploadFile(
      this.storageBucket,
      storagePath,
      file.buffer,
    );

    return this.prisma.fab.create({
      data: {
        name: metadata.name,
        publisherName: metadata.publisherName,
        description: dto.description,
        fabHash: metadata.fabHash,
        version: metadata.version,
        storagePath,
        storageBucket: this.storageBucket,
        sizeBytes: BigInt(file.size),
        isDefault: false,
        isPublic: dto.isPublic ?? false,
        organizationId,
        projectId: dto.projectId ?? null,
        uploadedById: userId,
      },
    });
  }

  async uploadDefaultFab(
    userId: string,
    dto: UploadDefaultFabDto,
    file: Express.Multer.File,
  ): Promise<Fab> {
    const metadata = extractFabMetadataFromFilename(file.originalname);
    const existingFab = await this.prisma.fab.findFirst({
      where: { fabHash: metadata.fabHash },
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

    await this.supabase.uploadFile(
      this.storageBucket,
      storagePath,
      file.buffer,
    );

    return this.prisma.fab.create({
      data: {
        name: metadata.name,
        publisherName: metadata.publisherName,
        description: dto.description,
        fabHash: metadata.fabHash,
        version: metadata.version,
        storagePath,
        storageBucket: this.storageBucket,
        sizeBytes: BigInt(file.size),
        isDefault: true,
        isPublic: dto.isPublic ?? true,
        organizationId: null,
        projectId: null,
        uploadedById: userId,
      },
    });
  }

  async listFabs(organizationId: string, projectId?: string): Promise<Fab[]> {
    return this.prisma.fab.findMany({
      where: {
        OR: buildFabAccessFilter(organizationId, projectId),
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
    return this.supabase.downloadFile(this.storageBucket, fab.storagePath);
  }

  async downloadFab(fabId: string, organizationId: string): Promise<Buffer> {
    const fab = await this.getFab(fabId, organizationId);
    return this.supabase.downloadFile(this.storageBucket, fab.storagePath);
  }

  async getFabPackageByNode(nodeId: string): Promise<FabPackage> {
    const trainingRunData =
      await this.runParticipantService.getActiveTrainingRunForNode(nodeId);

    if (!trainingRunData) {
      throw new BadRequestException({
        code: ErrorCode.TRAINING_NOT_FOUND,
        message: 'No active training run found for this node',
      });
    }

    const [trainingRun, fab] = await Promise.all([
      this.prisma.trainingRun.findUniqueOrThrow({
        where: { id: trainingRunData.runId },
      }),
      trainingRunData.fab
        ? this.prisma.fab.findUniqueOrThrow({
            where: { fabHash: trainingRunData.fab.fabHash },
          })
        : this.getDefaultFab(),
    ]);

    const content = await this.supabase.downloadFile(
      this.storageBucket,
      fab.storagePath,
    );

    return { trainingRun, fab, content };
  }

  async getFabMetadataByNode(nodeId: string) {
    const trainingRunData =
      await this.runParticipantService.getActiveTrainingRunForNode(nodeId);

    if (trainingRunData?.fab) {
      const fab = await this.prisma.fab.findFirst({
        where: { fabHash: trainingRunData.fab.fabHash },
      });
      if (fab) return fab;
    }

    return this.getDefaultFab();
  }

  private async getDefaultFab() {
    const defaultFab = await this.prisma.fab.findFirst({
      where: { isDefault: true },
      orderBy: { createdAt: 'desc' },
      include: {
        organization: {
          select: { name: true },
        },
      },
    });

    if (!defaultFab) {
      throw new NotFoundException({
        code: ErrorCode.FAB_NOT_FOUND,
        message:
          'No FAB associated with this node and no default FAB available',
      });
    }

    return defaultFab;
  }
}
