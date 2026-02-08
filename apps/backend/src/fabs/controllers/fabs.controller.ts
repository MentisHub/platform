import {
  Body,
  Controller,
  Get,
  Post,
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
import { NodePayload } from 'src/authentication/decorators/node.decorator';
import { UserPayload } from 'src/authentication/decorators/user.decorator';
import {
  NodePayloadData,
  UserPayloadData,
} from 'src/authentication/interfaces/payload.interface';
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
    @UserPayload() user: UserPayloadData,
    @Body() dto: UploadDefaultFabDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<FabResponseDto> {
    const fab = await this.fabsService.uploadDefaultFab(user.sub, dto, file);
    return FabResponseDto.fromEntity(fab);
  }

  @Get('node/info')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get node FAB metadata',
    description: 'Retrieves FAB metadata for authenticated node',
  })
  @ApiResponse({
    status: 200,
    description: 'FAB metadata retrieved successfully',
    type: FabResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'FAB not found for this node',
  })
  async getNodeFabInfo(
    @NodePayload() node: NodePayloadData,
  ): Promise<FabResponseDto> {
    const fab = await this.fabsService.getFabMetadataByNode(node.sub);
    return FabResponseDto.fromEntity(fab);
  }

  @Get('node/package')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Download node FAB package',
    description: 'Retrieves complete FAB package for authenticated node',
  })
  @ApiResponse({
    status: 200,
    description: 'FAB package retrieved successfully',
    type: FabPackageResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'FAB package not found for this node',
  })
  async getNodeFabPackage(
    @NodePayload() node: NodePayloadData,
  ): Promise<FabPackageResponseDto> {
    const fabPackage = await this.fabsService.getFabPackageByNode(node.sub);
    return FabPackageResponseDto.fromEntity(fabPackage);
  }
}
