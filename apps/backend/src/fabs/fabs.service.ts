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
import type { UploadDefaultFabDto, UploadFabDto } from './fabs.dto';

@Injectable()
export class FabsService {
  private readonly logger = new Logger(FabsService.name);
  private readonly storageBucket = 'fab';

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
    private readonly projectsService: ProjectsService,
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

    const existingFab = await this.prisma.fab.findFirst({
      where: {
        fabHash: dto.fabHash,
        version: dto.version,
        deletedAt: null,
      },
    });

    if (existingFab) {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.INVALID_INPUT,
        message: 'FAB with this hash and version already exists',
      });
    }

    const storagePath = dto.projectId
      ? `organizations/${organizationId}/projects/${dto.projectId}/${dto.fabHash}-${dto.version}.fab`
      : `organizations/${organizationId}/${dto.fabHash}-${dto.version}.fab`;

    await this.supabase.uploadFile(
      this.storageBucket,
      storagePath,
      file.buffer,
    );

    const fab = await this.prisma.fab.create({
      data: {
        name: dto.name,
        description: dto.description,
        fabHash: dto.fabHash,
        version: dto.version,
        storagePath,
        storageBucket: this.storageBucket,
        sizeBytes: BigInt(file.size),
        isDefault: false,
        isPublic: dto.isPublic ?? false,
        organizationId,
        projectId: dto.projectId,
        uploadedById: userId,
      },
    });

    this.logger.log(
      `FAB uploaded: ${fab.id} (${fab.fabHash}:${fab.version}) by user ${userId}`,
    );

    return fab;
  }

  async uploadDefaultFab(
    userId: string,
    dto: UploadDefaultFabDto,
    file: Express.Multer.File,
  ): Promise<Fab> {
    const existingFab = await this.prisma.fab.findFirst({
      where: {
        fabHash: dto.fabHash,
        version: dto.version,
        deletedAt: null,
      },
    });

    if (existingFab) {
      throw new BadRequestException({
        statusCode: 400,
        code: ErrorCode.INVALID_INPUT,
        message: 'FAB with this hash and version already exists',
      });
    }

    const storagePath = `default/${dto.fabHash}-${dto.version}.fab`;

    await this.supabase.uploadFile(
      this.storageBucket,
      storagePath,
      file.buffer,
    );

    const fab = await this.prisma.fab.create({
      data: {
        name: dto.name,
        description: dto.description,
        fabHash: dto.fabHash,
        version: dto.version,
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

    this.logger.log(
      `Default FAB uploaded: ${fab.id} (${fab.fabHash}:${fab.version})`,
    );

    return fab;
  }

  async listFabs(organizationId: string, projectId?: string): Promise<Fab[]> {
    return this.prisma.fab.findMany({
      where: {
        deletedAt: null,
        OR: [
          { organizationId, projectId: projectId ?? null },
          { isDefault: true },
          { isPublic: true },
        ],
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getFab(fabId: string, organizationId: string): Promise<Fab> {
    const fab = await this.prisma.fab.findFirst({
      where: {
        id: fabId,
        deletedAt: null,
        OR: [{ organizationId }, { isDefault: true }, { isPublic: true }],
      },
    });

    if (!fab) {
      throw new NotFoundException({
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: 'FAB not found',
      });
    }

    return fab;
  }

  async getFabById(fabId: string): Promise<Fab> {
    const fab = await this.prisma.fab.findUnique({
      where: { id: fabId, deletedAt: null },
    });

    if (!fab) {
      throw new NotFoundException({
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: 'FAB not found',
      });
    }

    return fab;
  }

  async getFabWithAccessCheck(
    fabId: string,
    organizationId: string,
  ): Promise<Fab> {
    const fab = await this.prisma.fab.findFirst({
      where: {
        id: fabId,
        deletedAt: null,
        OR: [{ organizationId }, { isDefault: true }, { isPublic: true }],
      },
    });

    if (!fab) {
      throw new NotFoundException({
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: 'FAB not found or access denied',
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

  async getFabPackageByNodeCertificate(certificateSerial: string): Promise<{
    fab: Fab & { organization: { name: string } | null };
    content: Buffer;
  }> {
    // Find node by certificate serial (normalize to lowercase for case-insensitive comparison)
    const normalizedSerial = certificateSerial.toLowerCase();

    const certificate = await this.prisma.nodeCertificate.findFirst({
      where: {
        serialNumber: normalizedSerial,
        revokedAt: null,
      },
      include: {
        node: {
          include: {
            trainingRun: {
              include: {
                fab: {
                  include: {
                    organization: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!certificate || !certificate.node) {
      throw new NotFoundException({
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: 'Certificate or node not found',
      });
    }

    const node = certificate.node;

    // Get associated training run and FAB
    const trainingRun = node.trainingRun;

    // TODO: Implement proper FAB association for SUPERNODE nodes
    // For now, allow supernodes without training runs to fetch default FAB
    if (!trainingRun?.fab) {
      // For supernodes, try to get the latest default FAB
      if (node.type === 'SUPERNODE') {
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
            statusCode: 404,
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: 'No default FAB available',
          });
        }

        this.logger.log(
          `Supernode ${node.id} fetching default FAB ${defaultFab.fabHash}`,
        );

        const fabContent = await this.supabase.downloadFile(
          this.storageBucket,
          defaultFab.storagePath,
        );

        return {
          fab: defaultFab,
          content: fabContent,
        };
      }

      throw new NotFoundException({
        statusCode: 404,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: 'No FAB associated with this node',
      });
    }

    const fab = trainingRun.fab;

    this.logger.log(
      `Node ${node.id} (cert ${certificateSerial}) fetching FAB ${fab.fabHash}`,
    );

    // Download FAB content
    const content = await this.supabase.downloadFile(
      this.storageBucket,
      fab.storagePath,
    );

    return { fab, content };
  }
}
