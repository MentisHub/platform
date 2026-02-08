export interface NodeCertificateBundle {
  rootCa: string;
  nodeId?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}
