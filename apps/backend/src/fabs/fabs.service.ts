import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ErrorCode } from '@platform/contracts';
import type { Fab } from '@prisma/client';
import { NodeCertificateService } from 'src/nodes/services/node-cert.service';
import { findActiveTrainingRun } from 'src/training/training.utils';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { SupabaseService } from '../supabase/supabase.service';
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
  private readonly logger = new Logger(FabsService.name);
  private readonly storageBucket = 'fab';

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly projectsService: ProjectsService,
    private readonly nodesCertificateService: NodeCertificateService,
  ) {}

  async uploadFab(
    organizationId: string,
    userId: string,
    dto: UploadFabDto,
    file: Express.Multer.File,
  ): Promise<Fab> {
    if (dto.projectId) {
      await this.projectsService.getProject(dto.projectId, organizationId);
    }

    const metadata = extractFabMetadataFromFilename(file.originalname);

    await this.validateFabNotExists(metadata.fabHash);

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

    await this.validateFabNotExists(metadata.fabHash);

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
        message: 'FAB not found',
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

  async getFabByHash(fabHash: string): Promise<Fab | null> {
    return this.prisma.fab.findFirst({
      where: {
        fabHash,
      },
    });
  }

  async downloadFabById(fabId: string): Promise<Buffer> {
    const fab = await this.getFabById(fabId);
    return this.supabase.downloadFile(this.storageBucket, fab.storagePath);
  }

  async downloadFab(fabId: string, organizationId: string): Promise<Buffer> {
    const fab = await this.getFab(fabId, organizationId);
    return this.supabase.downloadFile(this.storageBucket, fab.storagePath);
  }

  async getFabPackageByNodeCertificate(
    serialNumber: string,
  ): Promise<FabPackage> {
    const certificate =
      await this.nodesCertificateService.findNodeCertificateFab(serialNumber);

    const trainingRun = findActiveTrainingRun(certificate.node.trainingRuns);

    if (!trainingRun)
      throw new BadRequestException({
        message: '',
      });

    const fab = trainingRun?.fab ?? (await this.getDefaultFab());
    const content = await this.supabase.downloadFile(
      this.storageBucket,
      fab.storagePath,
    );

    return { trainingRun, fab, content };
  }

  async getFabMetadataByNodeCertificate(serialNumber: string) {
    const certificate =
      await this.nodesCertificateService.findNodeCertificateFab(serialNumber);

    const trainingRun = findActiveTrainingRun(certificate.node.trainingRuns);
    return trainingRun?.fab ?? (await this.getDefaultFab());
  }

  private async validateFabNotExists(fabHash: string): Promise<void> {
    const existingFab = await this.getFabByHash(fabHash);

    if (existingFab) {
      throw new BadRequestException({
        code: ErrorCode.FAB_ALREADY_EXISTS,
        message: 'FAB with this hash already exists',
      });
    }
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
