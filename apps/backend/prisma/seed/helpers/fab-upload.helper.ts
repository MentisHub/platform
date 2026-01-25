import { stat } from 'fs/promises';
import { basename } from 'path';

export interface FABFileMetadata {
  fileName: string;
  sizeBytes: bigint;
}

export async function extractFABMetadata(
  fabFilePath: string,
): Promise<FABFileMetadata> {
  const stats = await stat(fabFilePath);
  const sizeBytes = BigInt(stats.size);

  const fileName = basename(fabFilePath);

  return {
    fileName,
    sizeBytes,
  };
}

export function parseFABFilename(fileName: string): {
  publisher: string;
  name: string;
  version: string;
  hash: string;
} {
  const withoutExtension = fileName.replace('.fab', '');
  const parts = withoutExtension.split('.');

  if (parts.length < 3) {
    throw new Error("FAB name it's not valid");
  }

  return {
    publisher: parts[0],
    name: parts[1],
    version: parts[2].replace(/-/g, '.'),
    hash: parts[3],
  };
}
