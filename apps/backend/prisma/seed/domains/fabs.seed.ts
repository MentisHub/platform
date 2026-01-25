import { Fab, PrismaClient } from '@prisma/client';
import { readdir } from 'fs/promises';
import { join } from 'path';
import {
  extractFABMetadata,
  parseFABFilename,
} from '../helpers/fab-upload.helper.js';
import { uploadFABToStorage } from '../helpers/supabase.helper.js';
import { OrganizationWithMembers } from './organizations.seed.js';

const DEFAULT_FABS_DIR = join(
  process.cwd(),
  'prisma/seed/fixtures/fabs/default',
);

export async function seedFABs(
  prisma: PrismaClient,
  orgsWithMembers: OrganizationWithMembers[],
): Promise<Fab[]> {
  console.log(`Loading FABs from: ${DEFAULT_FABS_DIR}`);

  const files = await readdir(DEFAULT_FABS_DIR);
  const fabFiles = files.filter((file) => file.endsWith('.fab'));

  if (fabFiles.length === 0) {
    console.warn('No FAB files found in fixtures/fabs/default directory');
    return [];
  }

  console.log(`  Found ${fabFiles.length} FAB file(s)`);

  const firstUser = orgsWithMembers[0].organization.ownerId;
  const createdFabs: Fab[] = [];

  for (const fabFileName of fabFiles) {
    const fabPath = join(DEFAULT_FABS_DIR, fabFileName);

    try {
      const fabMetadata = await extractFABMetadata(fabPath);
      const { name, version, hash, publisher } = parseFABFilename(
        fabMetadata.fileName,
      );

      const storagePath = `default/${hash}-${version}.fab`;
      await uploadFABToStorage(fabPath, storagePath);

      const fab = await prisma.fab.create({
        data: {
          name,
          publisherName: publisher,
          description: `Default ${name} FAB for development and testing`,
          version,
          fabHash: hash,
          storagePath,
          storageBucket: 'fab',
          sizeBytes: fabMetadata.sizeBytes,
          isDefault: true,
          isPublic: true,
          organizationId: null,
          projectId: null,
          uploadedById: firstUser,
        },
      });

      createdFabs.push(fab);
      console.log(`  Created FAB record (id: ${fab.id})`);
    } catch (error) {
      console.error(`  Failed to process ${fabFileName}:`, error);
    }
  }

  console.log(`\n  Successfully seeded ${createdFabs.length} default FAB(s)`);
  return createdFabs;
}
