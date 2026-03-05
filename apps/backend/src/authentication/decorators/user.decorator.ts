import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { TokenType } from '../interfaces/payload.interface';
import { ErrorCode } from '@platform/contracts';

export const UserPayload = createParamDecorator((_, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();

  if (!request.auth) {
    throw new UnauthorizedException({
      code: ErrorCode.AUTHENTICATION_REQUIRED,
      message: 'Authentication required',
    });
  }

  if (request.auth.kind !== TokenType.BEARER) {
    throw new ForbiddenException({
      code: ErrorCode.AUTHENTICATION_REQUIRED,
      message: 'User authentication required',
    });
  }

  return request.auth.payload;
});
