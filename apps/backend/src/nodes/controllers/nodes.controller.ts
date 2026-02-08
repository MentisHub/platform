import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NodePayload } from 'src/authentication/decorators/node.decorator';
import { Public } from 'src/authentication/decorators/public.decorator';
import { NodePayloadData } from 'src/authentication/interfaces/payload.interface';
import {
  BootstrapRequestDto,
  BootstrapResponseDto,
  HeartbeatResponseDto,
  RecoverRequestDto,
  RecoverResponseDto,
  RefreshTokenRequestDto,
  RefreshTokenResponseDto,
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
      'Enrolls a new node using a pre-shared key (PSK), issues its first token, and registers public keys',
  })
  @ApiResponse({
    status: 201,
    description: 'Node activated successfully',
    type: BootstrapResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired PSK',
  })
  @ApiResponse({
    status: 500,
    description: 'Activation failed',
  })
  async activate(
    @Body() bootstrapDto: BootstrapRequestDto,
  ): Promise<BootstrapResponseDto> {
    const bundle = await this.nodesService.activate(
      bootstrapDto.psk,
      bootstrapDto.ecPublicKey,
    );
    return BootstrapResponseDto.fromEntity(bundle);
  }

  @Post('refresh')
  @Public()
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Exchanges refresh token for new access and refresh tokens',
  })
  @ApiResponse({
    status: 201,
    description: 'Token refreshed successfully',
    type: RefreshTokenResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  async refresh(
    @Body() dto: RefreshTokenRequestDto,
  ): Promise<RefreshTokenResponseDto> {
    const result = await this.nodesService.refresh(dto.refreshToken);
    return RefreshTokenResponseDto.fromData(result);
  }

  @Post('recover')
  @Public()
  @ApiOperation({
    summary: 'Recover node credentials',
    description:
      'Recovers access using EC signature verification (for lost refresh token)',
  })
  @ApiResponse({
    status: 201,
    description: 'Credentials recovered successfully',
    type: RecoverResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid signature or node not found',
  })
  async recover(@Body() dto: RecoverRequestDto): Promise<RecoverResponseDto> {
    const result = await this.nodesService.recover(
      dto.nodeId,
      dto.challenge,
      dto.signature,
    );
    return RecoverResponseDto.fromData(result);
  }

  @Post('ready')
  @ApiOperation({
    summary: 'Mark node as ready',
    description: 'Called by node after FAB installation completes successfully',
  })
  @ApiResponse({
    status: 201,
    description: 'Node marked as ready',
  })
  @ApiResponse({
    status: 404,
    description: 'Node not found',
  })
  async ready(@NodePayload() node: NodePayloadData): Promise<void> {
    await this.nodesService.markNodeReady(node.sub);
  }

  @Post('heartbeat')
  @ApiOperation({
    summary: 'Node heartbeat',
    description: 'Signals node is alive and checks for active training',
  })
  @ApiResponse({
    status: 201,
    description: 'Heartbeat successful',
    type: HeartbeatResponseDto,
  })
  async heartbeat(
    @NodePayload() node: NodePayloadData,
  ): Promise<HeartbeatResponseDto> {
    return this.nodesService.heartbeat(node.sub);
  }
}
