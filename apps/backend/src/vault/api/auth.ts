import type { VaultHttp } from '../http';
import type { VaultApproleLoginResponse } from '../types/auth';

export class VaultAuth {
  constructor(private readonly http: VaultHttp) {}

  async approleLogin(
    roleId: string,
    secretId: string,
  ): Promise<VaultApproleLoginResponse> {
    const response = await this.http.post<VaultApproleLoginResponse>(
      'auth/approle/login',
      {
        role_id: roleId,
        secret_id: secretId,
      },
    );

    this.http.setToken(response.auth.client_token);

    return response;
  }

  async renewToken(): Promise<VaultApproleLoginResponse> {
    const response = await this.http.post<VaultApproleLoginResponse>(
      'auth/token/renew-self',
      {},
    );

    this.http.setToken(response.auth.client_token);

    return response;
  }

  async revokeToken(): Promise<void> {
    await this.http.post('auth/token/revoke-self', {});
  }

  async createPolicy(policyName: string, policyRules: string): Promise<void> {
    await this.http.put(`sys/policy/${policyName}`, {
      policy: policyRules,
    });
  }

  async createAppRole(
    roleName: string,
    policies: string[],
    tokenTTL: string = '720h',
  ): Promise<void> {
    await this.http.post(`auth/approle/role/${roleName}`, {
      token_policies: policies,
      token_ttl: tokenTTL,
      token_max_ttl: '8760h',
      secret_id_ttl: '0',
      secret_id_num_uses: 0,
    });
  }

  async getAppRoleId(roleName: string): Promise<string> {
    const response = await this.http.get<{ data: { role_id: string } }>(
      `auth/approle/role/${roleName}/role-id`,
    );
    return response.data.role_id;
  }

  async generateSecretId(roleName: string): Promise<string> {
    const response = await this.http.post<{
      data: { secret_id: string };
    }>(`auth/approle/role/${roleName}/secret-id`, {});
    return response.data.secret_id;
  }

  async deleteAppRole(roleName: string): Promise<void> {
    await this.http.delete(`auth/approle/role/${roleName}`);
  }

  async deletePolicy(policyName: string): Promise<void> {
    await this.http.delete(`sys/policy/${policyName}`);
  }
}
