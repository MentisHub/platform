import { Fab, Organization, PrismaClient, Project } from '@prisma/client';
import { createHash } from 'crypto';
import { readdir } from 'fs/promises';
import { join } from 'path';
import {
  extractFABMetadata,
  parseFABFilename,
} from '../helpers/fab-upload.helper.js';
import { uploadFABToStorage } from '../helpers/supabase.helper.js';

const DEFAULT_FABS_DIR = join(
  process.cwd(),
  'prisma/seed/fixtures/fabs/default',
);

export interface FixtureFAB {
  filePath: string;
  name: string;
  publisher: string;
  version: string;
  hash: string;
  sizeBytes: bigint;
  description: string | null;
}

async function loadFixtureFABs(): Promise<FixtureFAB[]> {
  const files = await readdir(DEFAULT_FABS_DIR);
  const fabFiles = files.filter((f) => f.endsWith('.fab'));

  const fixtures: FixtureFAB[] = [];

  for (const fileName of fabFiles) {
    const filePath = join(DEFAULT_FABS_DIR, fileName);
    const metadata = await extractFABMetadata(filePath);
    const parsed = parseFABFilename(metadata.fileName);
    fixtures.push({
      filePath,
      name: parsed.name,
      publisher: parsed.publisher,
      version: parsed.version,
      hash: parsed.hash,
      sizeBytes: metadata.sizeBytes,
      description: metadata.description,
    });
  }

  return fixtures;
}

function scopedHash(originalHash: string, scope: string): string {
  return createHash('sha256')
    .update(`${originalHash}:${scope}`)
    .digest('hex')
    .slice(0, 8);
}

export async function seedDefaultFabs(
  prisma: PrismaClient,
  uploaderId: string,
): Promise<{ fabs: Fab[]; fixture: FixtureFAB | null }> {
  const fixtures = await loadFixtureFABs();

  if (fixtures.length === 0) {
    console.warn('  No FAB files found in fixtures/fabs/default');
    return { fabs: [], fixture: null };
  }

  const fabs: Fab[] = [];

  for (const fixture of fixtures) {
    try {
      const storagePath = `default/${fixture.hash}-${fixture.version}.fab`;
      await uploadFABToStorage(fixture.filePath, storagePath);

      const fab = await prisma.fab.create({
        data: {
          name: fixture.name,
          publisherName: fixture.publisher,
          description:
            fixture.description ??
            `Default system FAB — available to all organizations`,
          version: fixture.version,
          fabHash: fixture.hash,
          storagePath,
          sizeBytes: fixture.sizeBytes,
          isDefault: true,
          isPublic: true,
          uploadedBy: uploaderId,
        },
      });

      fabs.push(fab);
      console.log(
        `  [FAB:DEFAULT]   ${fixture.name}@${fixture.version}  →  ${fab.id}`,
      );
    } catch (error) {
      console.error(`  Failed to process ${fixture.name}:`, error);
    }
  }

  return { fabs, fixture: fixtures[0] ?? null };
}

export async function createOrgFab(
  prisma: PrismaClient,
  organization: Organization,
  fixture: FixtureFAB,
): Promise<Fab | null> {
  const hash = scopedHash(fixture.hash, `org:${organization.id}`);
  const storagePath = `organizations/${organization.id}/${hash}-${fixture.version}.fab`;

  try {
    await uploadFABToStorage(fixture.filePath, storagePath);

    return await prisma.fab.create({
      data: {
        name: fixture.name,
        publisherName: fixture.publisher,
        description:
          fixture.description ??
          `Org-scoped FAB for "${organization.name}" — accessible to all its projects`,
        version: fixture.version,
        fabHash: hash,
        storagePath,
        sizeBytes: fixture.sizeBytes,
        isDefault: false,
        isPublic: false,
        organizationId: organization.id,
        uploadedBy: organization.ownerId,
      },
    });
  } catch (error) {
    console.error(
      `  Failed to seed org FAB for "${organization.name}":`,
      error,
    );
    return null;
  }
}

export async function createProjectFab(
  prisma: PrismaClient,
  project: Project,
  organizationId: string,
  orgOwner: string,
  fixture: FixtureFAB,
): Promise<Fab | null> {
  const hash = scopedHash(fixture.hash, `project:${project.id}`);
  const storagePath = `organizations/${organizationId}/projects/${project.id}/${hash}-${fixture.version}.fab`;

  try {
    await uploadFABToStorage(fixture.filePath, storagePath);

    return await prisma.fab.create({
      data: {
        name: fixture.name,
        publisherName: fixture.publisher,
        description:
          fixture.description ?? `Project-scoped FAB for "${project.name}"`,
        version: fixture.version,
        fabHash: hash,
        storagePath,
        sizeBytes: fixture.sizeBytes,
        isDefault: false,
        isPublic: false,
        organizationId,
        projectId: project.id,
        uploadedBy: orgOwner,
      },
    });
  } catch (error) {
    console.error(`  Failed to seed project FAB for "${project.name}":`, error);
    return null;
  }
}
