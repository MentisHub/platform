import { JWTPayload } from 'jose';

export interface JWTPayloadFactory<T> {
  from(payload: JWTPayload): T;
}

export enum TokenType {
  BEARER = 'Bearer',
  NODE = 'Node',
}

export class UserPayloadData {
  constructor(
    public readonly sub: string,
    public readonly email: string,
    public readonly aud: string,
    public readonly role: string,
    public readonly exp: number,
    public readonly iat: number,
  ) {}

  static from(payload: JWTPayload): UserPayloadData {
    return new UserPayloadData(
      payload.sub!,
      payload.email as string,
      payload.aud as string,
      payload.role as string,
      payload.exp!,
      payload.iat!,
    );
  }
}

export class NodePayloadData {
  constructor(
    public readonly sub: string,
    public readonly aud: string,
    public readonly exp: number,
    public readonly iat: number,
  ) {}

  static from(payload: JWTPayload): NodePayloadData {
    return new NodePayloadData(
      payload.sub!,
      payload.aud as string,
      payload.exp!,
      payload.iat!,
    );
  }
}
