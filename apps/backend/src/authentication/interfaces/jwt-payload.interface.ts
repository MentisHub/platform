export interface JwtPayload {
  sub: string;
  email: string;
  aud: string;
  role: string;
  exp: number;
  iat: number;
}
