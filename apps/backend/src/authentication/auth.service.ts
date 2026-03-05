import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '@platform/contracts';
import { errors, jwtVerify } from 'jose';
import { JWTPayloadFactory } from './interfaces/payload.interface';

@Injectable()
export class AuthenticationService {
  private readonly secretHS256: Uint8Array;

  constructor(private configService: ConfigService) {
    const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    this.secretHS256 = new TextEncoder().encode(jwtSecret);
  }

  async validateToken<T>(
    token: string,
    factory: JWTPayloadFactory<T>,
  ): Promise<T> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException({
        code: ErrorCode.TOKEN_INVALID,
        message: 'Token is invalid',
      });
    }

    try {
      const { payload } = await jwtVerify(token, this.secretHS256);
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
