import type { VaultHttp } from '../http';
import type { VaultResponse } from '../types/auth';
import type {
  PKICACertificate,
  PKIIntermediateGenerateResponse,
  PKIIntermediateSetSignedResponse,
  PKIIssueCertificateResponse,
  PKIRevokeResponse,
  PKISignIntermediateResponse,
  PKISignResponse,
} from '../types/pki';

export class VaultPKI {
  constructor(private readonly http: VaultHttp) {}

  async getCA(path: string): Promise<PKICACertificate> {
    const response = await this.http.get<VaultResponse<PKICACertificate>>(
      `${path}/cert/ca`,
    );
    return response.data;
  }

  async getRootCA(): Promise<string> {
    const response =
      await this.http.get<VaultResponse<{ certificate: string }>>(
        'pki/cert/ca',
      );
    return response.data.certificate;
  }

  async signCSR(
    path: string,
    csr: string,
    commonName: string,
    ttl?: string,
  ): Promise<PKISignResponse> {
    const response = await this.http.post<VaultResponse<PKISignResponse>>(
      `${path}/sign/server`,
      {
        csr,
        common_name: commonName,
        ttl: ttl || '8760h', // 1 year
      },
    );
    return response.data;
  }

  async generateIntermediate(
    path: string,
    commonName: string,
    ttl: string = '43800h',
  ): Promise<PKIIntermediateGenerateResponse> {
    const response = await this.http.post<
      VaultResponse<PKIIntermediateGenerateResponse>
    >(`${path}/intermediate/generate/internal`, {
      common_name: commonName,
      ttl,
    });
    return response.data;
  }

  async setSignedIntermediate(
    mountPath: string,
    certificate: string,
  ): Promise<PKIIntermediateSetSignedResponse> {
    const response = await this.http.post<
      VaultResponse<PKIIntermediateSetSignedResponse>
    >(`${mountPath}/intermediate/set-signed`, {
      certificate,
    });
    return response.data;
  }

  async signIntermediate(
    csr: string,
    commonName: string,
    ttl: string = '43800h',
  ): Promise<PKISignIntermediateResponse> {
    const response = await this.http.post<
      VaultResponse<PKISignIntermediateResponse>
    >('pki/root/sign-intermediate', {
      csr,
      common_name: commonName,
      ttl,
      format: 'pem_bundle',
    });
    return response.data;
  }

  async signNodeCertificate(
    mountPath: string,
    csr: string,
    commonName: string,
    ttl: string = '8760h',
  ): Promise<PKIIssueCertificateResponse> {
    const response = await this.http.post<
      VaultResponse<PKIIssueCertificateResponse>
    >(`${mountPath}/sign/node-cert`, {
      csr,
      common_name: commonName,
      ttl,
    });
    return response.data;
  }

  async issueCertificate(
    mountPath: string,
    role: string,
    commonName: string,
    ttl: string,
  ): Promise<PKIIssueCertificateResponse> {
    const response = await this.http.post<
      VaultResponse<PKIIssueCertificateResponse>
    >(`${mountPath}/issue/${role}`, {
      common_name: commonName,
      ttl,
    });
    return response.data;
  }

  async configureUrls(
    mountPath: string,
    issuingCertificates: string,
    crlDistributionPoints: string,
  ): Promise<void> {
    await this.http.post(`${mountPath}/config/urls`, {
      issuing_certificates: issuingCertificates,
      crl_distribution_points: crlDistributionPoints,
    });
  }

  async createRole(
    mountPath: string,
    roleName: string,
    config: {
      allowed_domains?: string[];
      allow_subdomains?: boolean;
      max_ttl?: string;
      key_bits?: number;
      key_type?: string;
      require_cn?: boolean;
    },
  ): Promise<void> {
    await this.http.post(`${mountPath}/roles/${roleName}`, config);
  }

  async mountPKI(
    mountPath: string,
    maxLeaseTtl: string = '87600h',
  ): Promise<void> {
    await this.http.post(`sys/mounts/${mountPath}`, {
      type: 'pki',
      config: {
        max_lease_ttl: maxLeaseTtl,
      },
    });
  }

  async unmountPKI(mountPath: string): Promise<void> {
    await this.http.delete(`sys/mounts/${mountPath}`);
  }

  async revokeCertificate(
    mountPath: string,
    serialNumber: string,
  ): Promise<PKIRevokeResponse> {
    const response = await this.http.post<VaultResponse<PKIRevokeResponse>>(
      `${mountPath}/revoke`,
      {
        serial_number: serialNumber,
      },
    );
    return response.data;
  }
}
