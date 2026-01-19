import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { PaginatedFabsResponse } from '@platform/contracts';
import { ErrorCode } from '@platform/contracts';
import { Response } from 'express';
import type { PeerCertificate } from 'tls';
import { Public } from 'src/authentication/decorators/public.decorator';
import { CurrentUser } from 'src/authentication/decorators/current-user.decorator';
import type { JwtPayload } from 'src/authentication/interfaces/jwt-payload.interface';
import { FabResponseDto, ListFabsQueryDto, UploadFabDto } from '../fabs.dto';
import { FabsService } from '../fabs.service';
import { ClientCertificate } from 'src/nodes/decorators/node-from-cert.decorator';

@ApiTags('fabs')
@Controller('fabs')
export class FabsController {
  private readonly logger = new Logger(FabsController.name);

  constructor(private readonly fabsService: FabsService) {}

  @ApiBearerAuth()
  @Post('organizations/:organizationId')
  @ApiOperation({ summary: 'Upload a FAB file' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        name: { type: 'string' },
        description: { type: 'string' },
        fabHash: { type: 'string' },
        version: { type: 'string' },
        projectId: { type: 'string', format: 'uuid' },
        isPublic: { type: 'boolean' },
      },
      required: ['file', 'name', 'fabHash', 'version'],
    },
  })
  @ApiCreatedResponse({
    description: 'FAB uploaded successfully',
    type: FabResponseDto,
  })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UploadFabDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<FabResponseDto> {
    const fab = await this.fabsService.uploadFab(
      organizationId,
      user.sub,
      dto,
      file,
    );

    return FabResponseDto.fromEntity(fab);
  }

  @ApiBearerAuth()
  @Get('organizations/:organizationId')
  @ApiOperation({ summary: 'List FABs' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiOkResponse({
    description: 'List of FABs',
  })
  async list(
    @Param('organizationId') organizationId: string,
    @Query() query: ListFabsQueryDto,
  ): Promise<PaginatedFabsResponse> {
    const fabs = await this.fabsService.listFabs(
      organizationId,
      query.projectId,
    );

    return {
      data: fabs.map((fab) => FabResponseDto.fromEntity(fab)),
      meta: {
        page: query.page ?? 1,
        limit: query.limit ?? 10,
        total: fabs.length,
        totalPages: Math.ceil(fabs.length / (query.limit ?? 10)),
      },
    };
  }

  @ApiBearerAuth()
  @Get('organizations/:organizationId/:fabId')
  @ApiOperation({ summary: 'Get FAB by ID' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'fabId', description: 'FAB ID' })
  @ApiOkResponse({
    description: 'FAB found',
    type: FabResponseDto,
  })
  async findOne(
    @Param('organizationId') organizationId: string,
    @Param('fabId') fabId: string,
  ): Promise<FabResponseDto> {
    const fab = await this.fabsService.getFab(fabId, organizationId);
    return FabResponseDto.fromEntity(fab);
  }

  @ApiBearerAuth()
  @Get('organizations/:organizationId/:fabId/download')
  @ApiOperation({ summary: 'Download FAB file' })
  @ApiParam({ name: 'organizationId', description: 'Organization ID' })
  @ApiParam({ name: 'fabId', description: 'FAB ID' })
  @ApiOkResponse({
    description: 'FAB file',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  async download(
    @Param('organizationId') organizationId: string,
    @Param('fabId') fabId: string,
    @Res() res: Response,
  ): Promise<void> {
    const buffer = await this.fabsService.downloadFab(fabId, organizationId);
    const fab = await this.fabsService.getFab(fabId, organizationId);

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${fab.fabHash}-${fab.version}.fab"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }

  @Public()
  @Get('node/package')
  @ApiOperation({
    summary: 'Get FAB package for node (via mTLS)',
    description:
      'Returns FAB package for the node identified by mTLS certificate',
  })
  @ApiOkResponse({
    description: 'FAB package with metadata and content',
    schema: {
      type: 'object',
      properties: {
        fabHash: { type: 'string' },
        version: { type: 'string' },
        publisher: { type: 'string' },
        name: { type: 'string' },
        content: { type: 'string', description: 'Base64 encoded FAB content' },
      },
    },
  })
  async getNodeFabPackage(
    @ClientCertificate() certificate: PeerCertificate,
  ): Promise<{
    fabHash: string;
    version: string;
    publisher: string;
    name: string;
    content: string;
  }> {
    this.logger.debug(
      `FAB package request - Certificate: ${JSON.stringify({
        subject: certificate.subject,
        serialNumber: certificate.serialNumber,
        fingerprint: certificate.fingerprint,
      })}`,
    );

    const serialNumber = certificate.serialNumber?.replace(/:/g, '');
    if (!serialNumber) {
      this.logger.error(
        `Missing serial number in certificate: ${JSON.stringify(certificate)}`,
      );
      throw new UnauthorizedException({
        statusCode: 401,
        code: ErrorCode.INVALID_NODE_CREDENTIALS,
        message: 'Invalid certificate: missing serial number',
      });
    }

    const { fab, content } =
      await this.fabsService.getFabPackageByNodeCertificate(serialNumber);

    // Extract publisher from organization name or use default
    const publisher = fab.organization?.name || 'MentisHub';

    return {
      fabHash: fab.fabHash,
      version: fab.version,
      publisher,
      name: fab.name,
      content: content.toString('base64'),
    };
  }
}
