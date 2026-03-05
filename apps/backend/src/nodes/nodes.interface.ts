export interface NodeCertificateBundle {
  rootCa: string; // Root CA certificate (PEM)
  clientCert: string; // Node client certificate signed by CA (PEM, 7-day TTL)
  nodeId?: string; // Flower node ID
}

export interface CreateNodeInput {
  name?: string;
  projectId?: string;
  organizationId: string;
  userId: string;
  metadata?: Record<string, any>;
}
