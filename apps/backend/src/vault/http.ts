export class VaultHttp {
  private token?: string;
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string): void {
    this.token = token;
  }

  async request<T>(method: string, path: string, data?: unknown): Promise<T> {
    const url = `${this.baseUrl}/v1/${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        ...(this.token && { 'X-Vault-Token': this.token }),
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vault request failed: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, data: unknown): Promise<T> {
    return this.request<T>('POST', path, data);
  }

  async put<T>(path: string, data: unknown): Promise<T> {
    return this.request<T>('PUT', path, data);
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}
