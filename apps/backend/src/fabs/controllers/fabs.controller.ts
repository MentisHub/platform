import {
  Body,
  Controller,
  Get,
  Post,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorCode } from '@platform/contracts';
import { CurrentUser } from 'src/authentication/decorators/current-user.decorator';
import { Public } from 'src/authentication/decorators/public.decorator';
import type { JwtPayload } from 'src/authentication/interfaces/jwt-payload.interface';
import { ClientCertificate } from 'src/nodes/decorators/node-from-cert.decorator';
import { PeerCertificate } from 'tls';
import {
  FabPackageResponseDto,
  FabResponseDto,
  UploadDefaultFabDto,
} from '../fabs.dto';
import { FabsService } from '../fabs.service';

@ApiTags('fabs')
@Controller('fabs')
export class AdminFabsController {
  constructor(private readonly fabsService: FabsService) {}

  @Post('default')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload default FAB',
    description:
      'Uploads a default federated learning application bundle (FAB) accessible to all organizations',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Default FAB uploaded successfully',
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
    status: 500,
    description: 'File upload or storage failed',
  })
  async uploadDefault(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UploadDefaultFabDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<FabResponseDto> {
    const fab = await this.fabsService.uploadDefaultFab(user.sub, dto, file);
    return FabResponseDto.fromEntity(fab);
  }

  @Public()
  @Get('node/info')
  @ApiOperation({
    summary: 'Get node FAB metadata',
    description:
      'Retrieves FAB metadata for an authenticated node using its client certificate',
  })
  @ApiResponse({
    status: 200,
    description: 'FAB metadata retrieved successfully',
    type: FabResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid client certificate or missing serial number',
  })
  @ApiResponse({
    status: 404,
    description: 'FAB not found for this node',
  })
  async getNodeFabInfo(
    @ClientCertificate() certificate: PeerCertificate,
  ): Promise<FabResponseDto> {
    if (!certificate.serialNumber) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_NODE_CREDENTIALS,
        message: 'Invalid certificate: missing serial number',
      });
    }

    const fab = await this.fabsService.getFabMetadataByNodeCertificate(
      certificate.serialNumber,
    );

    return FabResponseDto.fromEntity(fab);
  }

  @Public()
  @Get('node/package')
  @ApiOperation({
    summary: 'Download node FAB package',
    description:
      'Retrieves the complete FAB package (including content) for an authenticated node',
  })
  @ApiResponse({
    status: 200,
    description: 'FAB package retrieved successfully',
    type: FabPackageResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid client certificate or no training run assigned',
  })
  @ApiResponse({
    status: 404,
    description: 'FAB package not found for this node',
  })
  async getNodeFabPackage(
    @ClientCertificate() certificate: PeerCertificate,
  ): Promise<FabPackageResponseDto> {
    if (!certificate.serialNumber) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_NODE_CREDENTIALS,
        message: 'Invalid certificate: missing serial number',
      });
    }

    const fabPackage = await this.fabsService.getFabPackageByNodeCertificate(
      certificate.serialNumber,
    );

    if (!fabPackage.trainingRun) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_NODE_CREDENTIALS,
        message: 'Invalid certificate: missing serial number',
      });
    }
    return FabPackageResponseDto.fromEntity(fabPackage);
  }
}
