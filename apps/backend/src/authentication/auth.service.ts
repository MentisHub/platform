import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify, errors } from 'jose';
import { ErrorCode } from '@platform/contracts';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthenticationService {
  private secret: Uint8Array;

  constructor(private configService: ConfigService) {
    const jwtSecret = this.configService.get<string>('JWT_SECRET');
    this.secret = new TextEncoder().encode(jwtSecret);
  }

  async validateToken(token: string): Promise<JwtPayload> {
    try {
      const { payload } = await jwtVerify(token, this.secret);
      return {
        sub: payload.sub!,
        email: payload.email as string,
        aud: payload.aud as string,
        role: payload.role as string,
        exp: payload.exp!,
        iat: payload.iat!,
      };
    } catch (error) {
      if (error instanceof errors.JWTExpired)
        throw new UnauthorizedException({
          statusCode: 401,
          code: ErrorCode.TOKEN_EXPIRED,
          message: 'Token expired',
        });

      throw new UnauthorizedException({
        statusCode: 401,
        code: ErrorCode.TOKEN_INVALID,
        message: 'Invalid token',
      });
    }
  }
}
