import { Logger } from '@nestjs/common';
import { VaultAuth } from './api/auth';
import { VaultHttp } from './http';

export class VaultTokenRenewer {
  private readonly logger = new Logger(VaultTokenRenewer.name);
  private renewalInterval: NodeJS.Timeout | null = null;
  private readonly RENEWAL_INTERVAL_MS = 45 * 60 * 1000; // 45 minutos

  constructor(
    private readonly http: VaultHttp,
    private readonly auth: VaultAuth,
    private readonly roleId: string,
    private readonly secretId: string,
  ) {}

  startRenewal() {
    if (this.renewalInterval) {
      this.logger.warn('Token renewal already started');
      return;
    }

    this.logger.log(
      `Starting automatic token renewal (every ${this.RENEWAL_INTERVAL_MS / 60000} minutes)`,
    );

    this.renewalInterval = setInterval(() => {
      void this.renewToken();
    }, this.RENEWAL_INTERVAL_MS);
  }

  stopRenewal() {
    if (this.renewalInterval) {
      clearInterval(this.renewalInterval);
      this.renewalInterval = null;
      this.logger.log('Token renewal stopped');
    }
  }

  async authenticate(): Promise<void> {
    try {
      this.logger.log('Authenticating with Vault...');
      await this.auth.approleLogin(this.roleId, this.secretId);
      this.logger.log('Vault authenticated successfully');
    } catch (error) {
      this.logger.error(
        'Failed to authenticate with Vault',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  private async renewToken() {
    try {
      this.logger.debug('Renewing Vault token...');
      const response = await this.auth.renewToken();
      this.logger.log(
        `Token renewed successfully. Lease duration: ${response.auth.lease_duration}s`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to renew token, attempting re-authentication',
        error instanceof Error ? error.stack : String(error),
      );
      await this.reAuthenticate();
    }
  }

  private async reAuthenticate() {
    try {
      this.logger.log('Re-authenticating with Vault...');
      await this.auth.approleLogin(this.roleId, this.secretId);
      this.logger.log('Re-authentication successful');
    } catch (error) {
      this.logger.error(
        'Failed to re-authenticate with Vault',
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
