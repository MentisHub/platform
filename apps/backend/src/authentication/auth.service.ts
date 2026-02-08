import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '@platform/contracts';
import { readFileSync } from 'fs';
import {
  errors,
  exportJWK,
  importPKCS8,
  importSPKI,
  JWTPayload,
  jwtVerify,
  SignJWT,
} from 'jose';
import { JWTPayloadFactory } from './interfaces/payload.interface';
import {
  HMACSecretJWK,
  JWKSResponse,
  RSAPublicJWK,
} from './interfaces/secrets.interface';

@Injectable()
export class AuthenticationService {
  private privateKeyRS256: CryptoKey | null = null;
  private publicKeyRS256: CryptoKey | null = null;
  private jwksResponse: JWKSResponse | null = null;
  private secretHS256: Uint8Array;
  private readonly issuer: string;

  constructor(private configService: ConfigService) {
    const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    this.secretHS256 = new TextEncoder().encode(jwtSecret);
    this.issuer = this.configService.get('BASE_URL', 'http://localhost:3000');

    const privateKeyPath = this.configService.get<string>(
      'JWT_PRIVATE_KEY_PATH',
      '/usr/src/app/certs/jwt_private.pem',
    );
    const publicKeyPath = this.configService.get<string>(
      'JWT_PUBLIC_KEY_PATH',
      '/usr/src/app/certs/jwt_public.pem',
    );

    const privateKeyPem = readFileSync(privateKeyPath, 'utf8');
    const publicKeyPem = readFileSync(publicKeyPath, 'utf8');

    void this.initializeKeys(privateKeyPem, publicKeyPem);
  }

  private async initializeKeys(privateKeyPem: string, publicKeyPem: string) {
    this.privateKeyRS256 = await importPKCS8(privateKeyPem, 'RS256');
    this.publicKeyRS256 = await importSPKI(publicKeyPem, 'RS256');

    const jwk = await exportJWK(this.publicKeyRS256);
    const rsaJWK: RSAPublicJWK = {
      kty: 'RSA',
      use: 'sig',
      alg: 'RS256',
      n: jwk.n!,
      e: jwk.e!,
      kid: jwk.kid,
    };

    const hmacJWK: HMACSecretJWK = {
      kty: 'oct',
      use: 'sig',
      alg: 'HS256',
      k: Buffer.from(this.secretHS256).toString('base64url'),
    };

    this.jwksResponse = {
      keys: [rsaJWK, hmacJWK],
    };
  }

  getJWKS(): JWKSResponse {
    if (!this.jwksResponse) {
      throw new Error('JWKS not initialized');
    }

    return this.jwksResponse;
  }

  async generateToken(
    payload: Record<string, any>,
    expirationTime = '24h',
    algorithm: 'HS256' | 'RS256' = 'HS256',
  ): Promise<string> {
    if (algorithm === 'RS256') {
      while (!this.privateKeyRS256) {
        await new Promise((resolve) => setTimeout(resolve, 3));
      }

      return new SignJWT(payload)
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuer(this.issuer)
        .setAudience('mentishub')
        .setIssuedAt()
        .setExpirationTime(expirationTime)
        .sign(this.privateKeyRS256);
    } else {
      return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer(this.issuer)
        .setAudience('mentishub')
        .setIssuedAt()
        .setExpirationTime(expirationTime)
        .sign(this.secretHS256);
    }
  }

  async validateToken<T>(
    token: string,
    factory: JWTPayloadFactory<T>,
  ): Promise<T> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const headerDecoded = JSON.parse(
      Buffer.from(parts[0], 'base64url').toString(),
    ) as { alg: string };

    try {
      const algorithm = headerDecoded.alg;

      let payload: JWTPayload;
      if (algorithm === 'RS256') {
        while (!this.publicKeyRS256) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        const { payload: p } = await jwtVerify(token, this.publicKeyRS256);
        payload = p;
      } else {
        const { payload: p } = await jwtVerify(token, this.secretHS256);
        payload = p;
      }

      return factory.from(payload);
    } catch (error) {
      if (error instanceof errors.JWTExpired) {
        throw new UnauthorizedException({
          code: ErrorCode.TOKEN_EXPIRED,
          message: 'Token expired',
        });
      }

      throw new UnauthorizedException({
        code: ErrorCode.TOKEN_INVALID,
        message: 'Invalid token',
      });
    }
  }
}
