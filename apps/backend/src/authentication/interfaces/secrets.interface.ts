export interface RSAPublicJWK {
  kty: 'RSA';
  use: 'sig';
  alg: 'RS256';
  n: string;
  e: string;
  kid?: string;
}

export interface HMACSecretJWK {
  kty: 'oct';
  use: 'sig';
  alg: 'HS256';
  k: string;
  kid?: string;
}

export type PublicJWK = RSAPublicJWK | HMACSecretJWK;

export interface JWKSResponse {
  keys: PublicJWK[];
}
