export interface VaultApproleLoginResponse {
  auth: {
    client_token: string;
    lease_duration: number;
    renewable: boolean;
    policies: string[];
  };
}

export interface VaultResponse<T = unknown> {
  data: T;
  lease_duration: number;
  renewable: boolean;
  lease_id?: string;
}
