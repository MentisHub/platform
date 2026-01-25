import {
  BadGatewayException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

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

    try {
      const response = await fetch(url, {
        method,
        headers: {
          ...(this.token && { 'X-Vault-Token': this.token }),
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      const text = await response.text();

      if (!response.ok) {
        console.error('[VaultHttp] Vault returned error:', {
          path,
          status: response.status,
          statusText: response.statusText,
          response: text,
        });
        this.handleVaultError(response.status, text, path);
      }

      if (!text) return {} as Promise<T>;

      return JSON.parse(text) as Promise<T>;
    } catch (error) {
      if (error instanceof Error && 'statusCode' in error) {
        throw error;
      }
      console.error('[VaultHttp] Request failed:', {
        path,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new BadGatewayException({
        statusCode: 502,
        message: 'Failed to communicate with Vault service',
        error: `${path} - ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
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

  private handleVaultError(status: number, text: string, path: string): never {
    switch (status) {
      case 400:
        throw new BadGatewayException({
          statusCode: 400,
          message: 'Invalid request to Vault',
          details: text,
        });
      case 401:
        throw new UnauthorizedException({
          statusCode: 401,
          message: 'Vault authentication failed',
          details: text,
        });
      case 403:
        throw new ForbiddenException({
          statusCode: 403,
          message: 'Insufficient permissions for Vault operation',
          details: text,
        });
      case 404:
        throw new NotFoundException({
          statusCode: 404,
          message: 'Vault resource not found',
          details: text,
        });
      case 500:
      case 502:
      case 503:
        throw new BadGatewayException({
          statusCode: 502,
          message: 'Vault service error',
          details: text,
        });
      default:
        throw new InternalServerErrorException({
          statusCode: 500,
          message: `Vault request failed: ${path}`,
          details: text,
        });
    }
  }
}
