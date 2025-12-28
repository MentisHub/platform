import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '../generated/prisma/client.js';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const VAULT_ADDR = process.env.VAULT_ADDR || 'http://localhost:8200';
const VAULT_ROLE_ID = process.env.VAULT_ROLE_ID;
const VAULT_SECRET_ID = process.env.VAULT_SECRET_ID;

class VaultClient {
  private token: string | null = null;

  async login(): Promise<void> {
    if (!VAULT_ROLE_ID || !VAULT_SECRET_ID) {
      throw new Error('VAULT_ROLE_ID and VAULT_SECRET_ID are required');
    }

    const response = await fetch(`${VAULT_ADDR}/v1/auth/approle/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role_id: VAULT_ROLE_ID,
        secret_id: VAULT_SECRET_ID,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Vault login failed: ${response.status} ${text}`);
    }

    const data = (await response.json()) as { auth: { client_token: string } };
    this.token = data.auth.client_token;
    console.log('Vault login successful');
  }

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<{ ok: boolean; status: number; data: unknown }> {
    const response = await fetch(`${VAULT_ADDR}/v1/${path}`, {
      method,
      headers: {
        'X-Vault-Token': this.token || '',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    return { ok: response.ok, status: response.status, data };
  }

  async mount(
    mountPath: string,
    type: string,
    config: Record<string, unknown>,
  ): Promise<boolean> {
    const result = await this.request('POST', `sys/mounts/${mountPath}`, {
      type,
      config,
    });

    if (!result.ok && result.status === 400) {
      return false;
    }

    if (!result.ok) {
      throw new Error(
        `Failed to mount ${mountPath}: ${JSON.stringify(result.data)}`,
      );
    }

    return true;
  }

  async unmount(mountPath: string): Promise<void> {
    await this.request('DELETE', `sys/mounts/${mountPath}`);
  }

  async write(
    path: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
    const result = await this.request('POST', path, data);

    if (!result.ok) {
      throw new Error(
        `Failed to write to ${path}: ${JSON.stringify(result.data)}`,
      );
    }

    return result.data as Record<string, unknown> | null;
  }

  async issueCertificate(
    mountPath: string,
    role: string,
    commonName: string,
    ttl: string = '8760h',
  ): Promise<{
    serialNumber: string;
    certificate: string;
    privateKey: string;
  }> {
    const result = await this.write(`${mountPath}/issue/${role}`, {
      common_name: commonName,
      ttl,
    });

    const data = result?.data as
      | {
          serial_number?: string;
          certificate?: string;
          private_key?: string;
        }
      | undefined;

    if (!data?.serial_number || !data?.certificate || !data?.private_key) {
      throw new Error(`Failed to issue certificate for ${commonName}`);
    }

    return {
      serialNumber: data.serial_number,
      certificate: data.certificate,
      privateKey: data.private_key,
    };
  }
}

async function createOrganizationCA(
  vault: VaultClient,
  orgSlug: string,
  orgName: string,
): Promise<string> {
  const mountPath = `pki_org_${orgSlug}`;

  console.log(`Creating intermediate CA for org: ${orgSlug}`);

  const isNew = await vault.mount(mountPath, 'pki', {
    max_lease_ttl: '43800h',
  });

  if (!isNew) {
    console.log(`   PKI engine already exists at ${mountPath}`);
    return mountPath;
  }

  const commonName = `${orgName} Intermediate CA`;

  const csrResponse = await vault.write(
    `${mountPath}/intermediate/generate/internal`,
    {
      common_name: commonName,
      key_bits: 4096,
      ttl: '43800h',
    },
  );

  const csr = (csrResponse?.data as { csr?: string } | undefined)?.csr;
  if (!csr) {
    throw new Error(`Failed to generate CSR for ${orgSlug}`);
  }

  const signResponse = await vault.write('pki/root/sign-intermediate', {
    csr,
    common_name: commonName,
    ttl: '43800h',
    format: 'pem_bundle',
  });

  const certificate = (
    signResponse?.data as { certificate?: string } | undefined
  )?.certificate;
  if (!certificate) {
    throw new Error(`Failed to sign intermediate CA for ${orgSlug}`);
  }

  await vault.write(`${mountPath}/intermediate/set-signed`, { certificate });

  await vault.write(`${mountPath}/config/urls`, {
    issuing_certificates: `${VAULT_ADDR}/v1/${mountPath}/ca`,
    crl_distribution_points: `${VAULT_ADDR}/v1/${mountPath}/crl`,
  });

  await vault.write(`${mountPath}/roles/node-cert`, {
    allowed_domains: [`${orgSlug}.nodes.mentishub.local`],
    allow_subdomains: true,
    max_ttl: '8760h',
    key_bits: 2048,
    key_type: 'rsa',
    require_cn: true,
  });

  await vault.write(`${mountPath}/roles/server-app-cert`, {
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
    await vault.unmount(mountPath);
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
      const cert = await vault.issueCertificate(
        mountPath,
        'node-cert',
        commonName,
        '8760h',
      );

      await prisma.nodeCertificate.create({
        data: {
          nodeId: node.id,
          serialNumber: cert.serialNumber.replace(/:/g, ''),
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
      const cert = await vault.issueCertificate(
        mountPath,
        'server-app-cert',
        commonName,
        '720h',
      );

      await prisma.serverAppCertificate.create({
        data: {
          serverAppId: app.id,
          serialNumber: cert.serialNumber.replace(/:/g, ''),
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
