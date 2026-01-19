import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/authentication/decorators/public.decorator';
import { PeerCertificate } from 'tls';
import { ClientCertificate } from '../decorators/node-from-cert.decorator';
import {
  BootstrapRequestDto,
  BootstrapResponseDto,
  RenewCertificateRequestDto,
  RenewCertificateResponseDto,
} from '../nodes.dto';
import { NodesService } from '../nodes.service';

@ApiTags('Nodes')
@Controller('nodes')
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}

  @Post('bootstrap')
  @Public()
  @ApiOperation({
    summary: 'Bootstrap a node with PSK and CSR',
    description:
      'Nodes use this endpoint to exchange their PSK and CSR for mTLS certificates',
  })
  async bootstrap(
    @Body() bootstrapDto: BootstrapRequestDto,
  ): Promise<BootstrapResponseDto> {
    return this.nodesService.bootstrap(
      bootstrapDto.psk,
      bootstrapDto.csr,
      bootstrapDto.ec_public_key,
    );
  }

  @Post('renew-certificate')
  @Public()
  @ApiOperation({
    summary: 'Renew node certificate',
    description:
      'Nodes use this endpoint to renew their mTLS certificate before expiration. Requires valid mTLS authentication.',
  })
  async renewCertificate(
    @ClientCertificate() certificate: PeerCertificate,
    @Body() renewDto: RenewCertificateRequestDto,
  ): Promise<RenewCertificateResponseDto> {
    return this.nodesService.renewCertificate(
      certificate.serialNumber,
      renewDto.csr,
    );
  }
}
