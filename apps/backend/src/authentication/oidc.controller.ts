import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from './decorators/public.decorator';
import { AuthenticationService } from './auth.service';

@Controller()
export class OIDCController {
  private readonly baseUrl: string;

  constructor(
    private configService: ConfigService,
    private authService: AuthenticationService,
  ) {
    this.baseUrl = this.configService.get('BASE_URL', 'http://localhost:3000');
  }

  @Public()
  @Get('.well-known/openid-configuration')
  getConfiguration() {
    return {
      issuer: this.baseUrl,
      jwks_uri: `${this.baseUrl}/.well-known/jwks.json`,
      response_types_supported: ['token'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256', 'HS256'],
    };
  }

  @Public()
  @Get('.well-known/jwks.json')
  getJWKS() {
    return this.authService.getJWKS();
  }
}
