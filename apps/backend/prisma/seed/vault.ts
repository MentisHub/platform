import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '../generated/client/index.js';
import { VaultHttp } from '../../src/vault/http.js';
import { VaultAuth } from '../../src/vault/api/auth.js';
import { VaultPKI } from '../../src/vault/api/pki.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const VAULT_ADDR = process.env.VAULT_ADDR!;
const VAULT_ROLE_ID = process.env.VAULT_ROLE_ID!;
const VAULT_SECRET_ID = process.env.VAULT_SECRET_ID!;

class VaultClient {
  public readonly pki: VaultPKI;
  private readonly auth: VaultAuth;
  private readonly http: VaultHttp;

  constructor() {
    this.http = new VaultHttp(VAULT_ADDR);
    this.auth = new VaultAuth(this.http);
    this.pki = new VaultPKI(this.http);
  }

  async login(): Promise<void> {
    await this.auth.approleLogin(VAULT_ROLE_ID, VAULT_SECRET_ID);
    console.log('Vault login successful');
  }
}

async function createOrganizationCA(
  vault: VaultClient,
  orgSlug: string,
  orgName: string,
): Promise<string> {
  const mountPath = `pki_org_${orgSlug}`;

  console.log(`Creating intermediate CA for org: ${orgSlug}`);

  try {
    await vault.pki.mountPKI(mountPath, '43800h');
  } catch {
    console.log(`   PKI engine already exists at ${mountPath}`);
    return mountPath;
  }

  const commonName = `${orgName} Intermediate CA`;

  const csrData = await vault.pki.generateIntermediate(
    orgSlug,
    commonName,
    '43800h',
  );

  const signedCert = await vault.pki.signIntermediate(
    csrData.csr,
    commonName,
    '43800h',
  );

  await vault.pki.setSignedIntermediate(mountPath, signedCert.certificate);

  await vault.pki.configureUrls(
    mountPath,
    `${VAULT_ADDR}/v1/${mountPath}/ca`,
    `${VAULT_ADDR}/v1/${mountPath}/crl`,
  );

  await vault.pki.createRole(mountPath, 'node-cert', {
    allowed_domains: [`${orgSlug}.nodes.mentishub.local`],
    allow_subdomains: true,
    max_ttl: '8760h',
    key_bits: 2048,
    key_type: 'rsa',
    require_cn: true,
  });

  await vault.pki.createRole(mountPath, 'server-app-cert', {
    allowed_domains: [`${orgSlug}.server.mentishub.local`],
    allow_subdomains: true,
    max_ttl: '720h',
    key_bits: 2048,
    key_type: 'rsa',
    require_cn: true,
  });

  console.log(`   Created intermediate CA at ${mountPath}`);
  return mountPath;
}

async function cleanupOrganizationCAs(
  vault: VaultClient,
  orgSlugs: string[],
): Promise<void> {
  console.log('Cleaning up existing organization CAs...');

  for (const slug of orgSlugs) {
    const mountPath = `pki_org_${slug}`;
    console.log(`Trying to remove ${mountPath}`);
    try {
      await vault.pki.unmountPKI(mountPath);
    } catch {
      // Ignore errors if mount doesn't exist
    }
  }
}

async function issueNodeCertificates(
  vault: VaultClient,
  orgCAs: Map<string, string>,
): Promise<void> {
  console.log('Issuing node certificates...');

  const nodes = await prisma.node.findMany({
    where: { pskHash: { not: null } },
    include: {
      organization: { select: { slug: true } },
      certificate: true,
    },
  });

  let issued = 0;
  for (const node of nodes) {
    if (node.certificate) continue;

    const mountPath = orgCAs.get(node.organizationId);
    if (!mountPath) continue;

    const commonName = `${node.name}.${node.organization.slug}.nodes.mentishub.local`;

    try {
      const cert = await vault.pki.issueCertificate(
        mountPath,
        'node-cert',
        commonName,
        '8760h',
      );

      await prisma.nodeCertificate.create({
        data: {
          nodeId: node.id,
          serialNumber: cert.serial_number.replace(/:/g, ''),
          issuedAt: new Date(),
        },
      });

      issued++;
    } catch (error) {
      console.error(`Failed to issue cert for node ${node.name}:`, error);
    }
  }

  console.log(`Issued ${issued} node certificates`);
}

async function issueServerAppCertificates(
  vault: VaultClient,
  orgCAs: Map<string, string>,
): Promise<void> {
  console.log('Issuing server app certificates...');

  const serverApps = await prisma.serverApp.findMany({
    where: { certificate: null },
    include: {
      certificate: true,
      trainingRun: {
        include: {
          project: {
            include: {
              organization: { select: { id: true, slug: true } },
            },
          },
        },
      },
    },
  });

  let issued = 0;
  for (const app of serverApps) {
    const org = app.trainingRun.project.organization;
    const mountPath = orgCAs.get(org.id);
    if (!mountPath) continue;

    const commonName = `${app.podName}.${org.slug}.server.mentishub.local`;

    try {
      const cert = await vault.pki.issueCertificate(
        mountPath,
        'server-app-cert',
        commonName,
        '720h',
      );

      await prisma.serverAppCertificate.create({
        data: {
          serverAppId: app.id,
          serialNumber: cert.serial_number.replace(/:/g, ''),
          issuedAt: new Date(),
        },
      });

      issued++;
    } catch (error) {
      console.error(`Failed to issue cert for app ${app.podName}:`, error);
    }
  }

  console.log(`Issued ${issued} server app certificates`);
}

async function main(): Promise<void> {
  console.log('Seeding Vault PKI...');

  const vault = new VaultClient();
  await vault.login();

  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true },
  });

  if (organizations.length === 0) {
    console.log('No organizations found. Run database seed first.');
    return;
  }

  console.log(`Found ${organizations.length} organizations`);

  const orgSlugs = organizations.map((org) => org.slug);
  await cleanupOrganizationCAs(vault, orgSlugs);

  const orgCAs = new Map<string, string>();

  for (const org of organizations) {
    try {
      const vaultMountPath = await createOrganizationCA(
        vault,
        org.slug,
        org.name,
      );

      orgCAs.set(org.id, vaultMountPath);

      await prisma.organizationCA.upsert({
        where: { organizationId: org.id },
        update: { vaultMountPath },
        create: { organizationId: org.id, vaultMountPath },
      });
    } catch (error) {
      console.error(`Failed to create CA for ${org.slug}:`, error);
      throw error;
    }
  }

  await issueNodeCertificates(vault, orgCAs);
  await issueServerAppCertificates(vault, orgCAs);

  console.log('Vault PKI seeding completed successfully!');
}

main()
  .catch((e: unknown) => {
    console.error('Error seeding Vault:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
    void pool.end();
  });
