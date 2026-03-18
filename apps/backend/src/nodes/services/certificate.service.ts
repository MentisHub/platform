import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as x509 from '@peculiar/x509';
import * as crypto from 'crypto';
import * as fs from 'fs';

@Injectable()
export class CertificateService implements OnModuleInit {
  private readonly logger: Logger = new Logger(CertificateService.name);
  private caCert: x509.X509Certificate;
  private caKey: CryptoKey;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const caCertPath = this.configService.getOrThrow<string>('BACKEND_CA_PATH');
    const caKeyPath = this.configService.getOrThrow<string>(
      'BACKEND_CA_KEY_PATH',
    );

    const caCertPem = fs.readFileSync(caCertPath, 'utf8');
    const caKeyPem = fs.readFileSync(caKeyPath, 'utf8');

    this.caCert = new x509.X509Certificate(caCertPem);

    // PKCS#1 RSA key → PKCS#8 DER → WebCrypto CryptoKey
    const nodeKey = crypto.createPrivateKey(caKeyPem);
    const pkcs8Der = nodeKey.export({ format: 'der', type: 'pkcs8' }) as Buffer;
    this.caKey = await crypto.subtle.importKey(
      'pkcs8',
      pkcs8Der,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    this.logger.log(
      { action: 'ca.loaded' },
      'CA loaded for certificate issuance',
    );
  }

  async issueClientCert(
    nodeId: string,
    ecPublicKeyPem: string,
    ttlDays = 7,
  ): Promise<string> {
    const nodeKeyObject = crypto.createPublicKey(ecPublicKeyPem);
    const spkiDer = nodeKeyObject.export({
      format: 'der',
      type: 'spki',
    }) as Buffer;
    const nodePublicKey = await crypto.subtle.importKey(
      'spki',
      spkiDer,
      { name: 'ECDSA', namedCurve: 'P-384' },
      true,
      ['verify'],
    );

    const serialBytes = crypto.getRandomValues(new Uint8Array(16));
    const serial = Array.from(serialBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const notBefore = new Date();
    const notAfter = new Date(notBefore.getTime() + ttlDays * 86_400_000);

    const cert = await x509.X509CertificateGenerator.create({
      serialNumber: serial,
      subject: `CN=${nodeId}`,
      issuer: this.caCert.subjectName,
      notBefore,
      notAfter,
      signingAlgorithm: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      publicKey: nodePublicKey,
      signingKey: this.caKey,
      extensions: [
        new x509.KeyUsagesExtension(x509.KeyUsageFlags.digitalSignature, true),
        new x509.ExtendedKeyUsageExtension(
          [x509.ExtendedKeyUsage.clientAuth],
          false,
        ),
        await x509.AuthorityKeyIdentifierExtension.create(this.caCert, false),
      ],
    });

    this.logger.log(
      { action: 'cert.issued', nodeId, ttlDays, serial },
      'Client certificate issued',
    );

    return cert.toString('pem');
  }
}
