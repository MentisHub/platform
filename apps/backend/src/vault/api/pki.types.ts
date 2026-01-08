/**
 * Vault PKI API Types
 * Based on HashiCorp Vault PKI Secrets Engine API Documentation
 * @see https://developer.hashicorp.com/vault/api-docs/secret/pki
 */

/**
 * Response from GET /pki/cert/ca
 * Returns the CA certificate
 */
export interface PKICACertificate {
  certificate: string;
  ca_chain: string[];
  revocation_time: number;
}

/**
 * Response from POST /pki/sign/:role
 * Returns a signed certificate from a CSR
 */
export interface PKISignResponse {
  certificate: string;
  issuing_ca: string;
  ca_chain: string[];
  serial_number: string;
  expiration: string;
}

/**
 * Response from POST /pki/intermediate/generate/internal
 * Generates a new private key and CSR for intermediate CA
 */
export interface PKIIntermediateGenerateResponse {
  csr: string;
  private_key: string;
  private_key_type: string;
}

/**
 * Response from POST /pki/intermediate/set-signed
 * Sets a signed intermediate CA certificate
 */
export interface PKIIntermediateSetSignedResponse {
  imported_issuers: string[];
  imported_keys: string[];
  mapping: Record<string, string>;
}

/**
 * Response from POST /pki/issue/:role
 * Issues a certificate with generated private key
 */
export interface PKIIssueCertificateResponse {
  certificate: string;
  issuing_ca: string;
  ca_chain: string[];
  serial_number: string;
  private_key: string;
  private_key_type: string;
  expiration: number;
}

/**
 * Response from POST /pki/root/sign-intermediate
 * Signs an intermediate CA CSR
 */
export interface PKISignIntermediateResponse {
  certificate: string;
  issuing_ca: string;
  ca_chain: string[];
  serial_number: string;
  expiration: string;
}
