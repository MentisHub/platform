import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/authentication/decorators/public.decorator';
import { PeerCertificate } from 'tls';
import { ClientCertificate } from '../decorators/node-from-cert.decorator';
import {
  BootstrapRequestDto,
  BootstrapResponseDto,
  RenewCertificateRequestDto,
  RenewCertificateResponseDto,
} from '../nodes.dto';
import { NodesService } from '../services/nodes.service';

@ApiTags('nodes')
@Controller('nodes')
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}

  @Post('bootstrap')
  @Public()
  @ApiOperation({
    summary: 'Bootstrap node',
    description:
      'Enrolls a new node using a pre-shared key (PSK) and issues its first certificate',
  })
  @ApiResponse({
    status: 201,
    description: 'Node bootstrapped successfully, certificate bundle issued',
    type: BootstrapResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data or CSR format',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired PSK',
  })
  @ApiResponse({
    status: 500,
    description: 'Certificate issuance failed',
  })
  async bootstrap(
    @Body() bootstrapDto: BootstrapRequestDto,
  ): Promise<BootstrapResponseDto> {
    const certBundle = await this.nodesService.bootstrap(
      bootstrapDto.psk,
      bootstrapDto.csr,
      bootstrapDto.ecPublicKey,
    );
    return BootstrapResponseDto.fromEntity(certBundle);
  }

  @Post('renew-certificate')
  @Public()
  @ApiOperation({
    summary: 'Renew node certificate',
    description:
      'Renews the TLS certificate for an authenticated node using its current certificate',
  })
  @ApiResponse({
    status: 201,
    description: 'Certificate renewed successfully',
    type: RenewCertificateResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid CSR format',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid client certificate or missing serial number',
  })
  @ApiResponse({
    status: 404,
    description: 'Node not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Certificate renewal failed',
  })
  async renewCertificate(
    @ClientCertificate() certificate: PeerCertificate,
    @Body() renewDto: RenewCertificateRequestDto,
  ): Promise<RenewCertificateResponseDto> {
    const certBundle = await this.nodesService.renewCertificate(
      certificate.serialNumber,
      renewDto.csr,
    );
    return RenewCertificateResponseDto.fromEntity(certBundle);
  }
}
