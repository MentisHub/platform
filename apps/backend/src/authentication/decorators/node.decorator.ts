import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { TokenType } from '../interfaces/payload.interface';

export const NodePayload = createParamDecorator((_, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();

  if (!request.auth) {
    throw new UnauthorizedException('Authentication required');
  }

  if (request.auth.kind !== TokenType.NODE) {
    throw new ForbiddenException('Node authentication required');
  }

  return request.auth.payload;
});
