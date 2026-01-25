export interface NodeCertificateBundle {
  certificate: string;
  issuingCa: string;
  caChain: string[];
  serialNumber: string;
  expiration: number;
  rootCa: string;
}
