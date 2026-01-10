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
}
