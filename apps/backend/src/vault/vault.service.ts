import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VaultAuth } from './api/auth';
import { VaultPKI } from './api/pki';
import { VaultHttp } from './http';
import { VaultTokenRenewer } from './token-renewer';

@Injectable()
export class VaultService implements OnModuleInit, OnModuleDestroy {
  public readonly pki: VaultPKI;
  public readonly auth: VaultAuth;

  private readonly http: VaultHttp;
  private readonly tokenRenewer: VaultTokenRenewer;

  constructor(private readonly configService: ConfigService) {
    const vaultAddr = this.configService.getOrThrow<string>('VAULT_ADDR');
    const roleId = this.configService.getOrThrow<string>('VAULT_ROLE_ID');
    const secretId = this.configService.getOrThrow<string>('VAULT_SECRET_ID');

    this.http = new VaultHttp(vaultAddr);
    this.pki = new VaultPKI(this.http);
    this.auth = new VaultAuth(this.http);
    this.tokenRenewer = new VaultTokenRenewer(
      this.http,
      this.auth,
      roleId,
      secretId,
    );
  }

  async onModuleInit() {
    await this.tokenRenewer.authenticate();
    this.tokenRenewer.startRenewal();
  }

  onModuleDestroy() {
    this.tokenRenewer.stopRenewal();
  }
}
