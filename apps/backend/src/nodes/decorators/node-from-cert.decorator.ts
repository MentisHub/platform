import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ErrorCode } from '@platform/contracts';
import { Request } from 'express';
import { PeerCertificate, TLSSocket } from 'tls';

export const ClientCertificate = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): PeerCertificate => {
    const request = ctx.switchToHttp().getRequest<Request>();

    const socket = request.socket as TLSSocket;
    const cert = socket?.getPeerCertificate?.();

    if (!cert) {
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_NODE_CREDENTIALS,
        message: 'Valid mTLS certificate required',
      });
    }

    return cert;
  },
);
