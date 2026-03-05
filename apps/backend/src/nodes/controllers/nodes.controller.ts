import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/authentication/decorators/public.decorator';
import {
  BootstrapRequestDto,
  BootstrapResponseDto,
  RotateRequestDto,
  RotateResponseDto,
} from '../nodes.dto';
import { NodesService } from '../services/nodes.service';

@ApiTags('nodes')
@Controller('nodes')
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}

  @Post('activate')
  @Public()
  @ApiOperation({
    summary: 'Activate node',
    description:
      'Enrolls a new node using a pre-shared key (PSK), registers its EC public key, and issues a signed X.509 client certificate',
  })
  @ApiResponse({
    status: 201,
    description: 'Node activated successfully',
    type: BootstrapResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Invalid or expired PSK' })
  @ApiResponse({ status: 500, description: 'Activation failed' })
  async activate(
    @Body() bootstrapDto: BootstrapRequestDto,
  ): Promise<BootstrapResponseDto> {
    const bundle = await this.nodesService.activate(
      bootstrapDto.psk,
      bootstrapDto.ecPublicKey,
    );
    return BootstrapResponseDto.fromEntity(bundle);
  }

  @Post('rotate')
  @Public()
  @ApiOperation({
    summary: 'Rotate node certificate',
    description:
      'Issues a new client certificate using EC signature verification (proof of key possession)',
  })
  @ApiResponse({
    status: 201,
    description: 'Certificate rotated successfully',
    type: RotateResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid signature or node not found',
  })
  async rotate(@Body() dto: RotateRequestDto): Promise<RotateResponseDto> {
    const bundle = await this.nodesService.rotate(
      dto.nodeId,
      dto.challenge,
      dto.signature,
    );
    return RotateResponseDto.fromEntity(bundle);
  }
}
