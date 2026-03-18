import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrgRole } from '@prisma/client';
import { Response } from 'express';
import { UserPayload } from 'src/authentication/decorators/user.decorator';
import { UserPayloadData } from 'src/authentication/interfaces/payload.interface';
import { RequireOrgRole } from 'src/authorization/decorators/roles.decorator';
import {
  FabResponseDto,
  ListFabsQueryDto,
  PaginatedFabsResponseDto,
  UploadFabDto,
} from '../fabs.dto';
import { FabsService } from '../fabs.service';

@ApiTags('fabs')
@ApiBearerAuth()
@Controller('organizations/:organizationId/fabs')
export class FabsController {
  constructor(private readonly fabsService: FabsService) {}

  @Post()
  @RequireOrgRole(OrgRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload FAB',
    description:
      'Uploads a federated learning application bundle (FAB) to an organization',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    type: String,
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'FAB uploaded successfully',
    type: FabResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or request data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions (requires ADMIN role)',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  @ApiResponse({
    status: 500,
    description: 'File upload or storage failed',
  })
  async upload(
    @Param('organizationId') organizationId: string,
    @UserPayload() user: UserPayloadData,
    @Body() dto: UploadFabDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<FabResponseDto> {
    const fab = await this.fabsService.uploadFab({
      organizationId,
      userId: user.sub,
      description: dto.description,
      isPublic: dto.isPublic,
      tags: dto.tags,
      projectId: dto.projectId,
      fileBuffer: file.buffer,
      originalname: file.originalname,
      size: file.size,
    });

    return FabResponseDto.fromEntity(fab);
  }

  @Get()
  @ApiOperation({
    summary: 'List FABs',
    description:
      'Retrieves a paginated list of FABs within an organization with optional project filter',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'List of FABs retrieved successfully',
    type: PaginatedFabsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  async list(
    @Param('organizationId') organizationId: string,
    @Query() query: ListFabsQueryDto,
  ): Promise<PaginatedFabsResponseDto> {
    const fabs = await this.fabsService.listFabs(
      organizationId,
      query.projectId,
      query.tags,
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

  @Get(':fabId')
  @RequireOrgRole(OrgRole.MEMBER)
  @ApiOperation({
    summary: 'Get FAB by ID',
    description: 'Retrieves metadata of a specific FAB',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    type: String,
  })
  @ApiParam({
    name: 'fabId',
    description: 'FAB UUID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'FAB metadata retrieved successfully',
    type: FabResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions (requires MEMBER role)',
  })
  @ApiResponse({
    status: 404,
    description: 'FAB not found',
  })
  async findOne(@Param('fabId') fabId: string): Promise<FabResponseDto> {
    const fab = await this.fabsService.getFabById(fabId);
    return FabResponseDto.fromEntity(fab);
  }

  @Get(':fabId/download')
  @RequireOrgRole(OrgRole.MEMBER)
  @ApiOperation({
    summary: 'Download FAB file',
    description: 'Downloads the FAB binary file',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    type: String,
  })
  @ApiParam({
    name: 'fabId',
    description: 'FAB UUID',
    type: String,
  })
  @ApiProduces('application/octet-stream')
  @ApiResponse({
    status: 200,
    description: 'FAB file downloaded successfully',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions (requires MEMBER role)',
  })
  @ApiResponse({
    status: 404,
    description: 'FAB not found',
  })
  @ApiResponse({
    status: 500,
    description: 'File download failed',
  })
  async download(
    @Param('fabId') fabId: string,
    @Res() res: Response,
  ): Promise<void> {
    const fab = await this.fabsService.getFabById(fabId);
    const buffer = await this.fabsService.downloadFabById(fabId);

    const filename = `${fab.publisherName}.${fab.name}.${fab.version}.${fab.fabHash}.fab`;

    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  }
}
