import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCode } from '@platform/contracts';
import { Request } from 'express';
import { AuthenticationService } from './auth.service';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { TokenType, UserPayloadData } from './interfaces/payload.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthenticationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException({
        code: ErrorCode.TOKEN_NOT_PROVIDED,
        message: 'No access token provided',
      });
    }

    if (token.tokenType === TokenType.BEARER) {
      const payload = await this.authService.validateToken(
        token.token,
        UserPayloadData,
      );
      request.auth = { kind: TokenType.BEARER, payload };
    } else {
      throw new UnauthorizedException({
        code: ErrorCode.TOKEN_INVALID,
        message: 'Token is invalid',
      });
    }

    return true;
  }

  private extractToken(
    request: Request,
  ): { tokenType: TokenType; token: string } | undefined {
    const [tokenType, token] = request.headers.authorization?.split(' ') ?? [];

    if (
      !tokenType ||
      !token ||
      !Object.values(TokenType).includes(tokenType as TokenType)
    )
      return undefined;

    return { tokenType: tokenType as TokenType, token };
  }
}
