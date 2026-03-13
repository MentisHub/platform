import { readFile, stat } from 'fs/promises';
import { basename } from 'path';
import { unzipSync } from 'fflate';

export interface FABFileMetadata {
  fileName: string;
  sizeBytes: bigint;
  description: string | null;
}

export async function extractFABMetadata(
  fabFilePath: string,
): Promise<FABFileMetadata> {
  const [stats, fileBuffer] = await Promise.all([
    stat(fabFilePath),
    readFile(fabFilePath),
  ]);

  const fileName = basename(fabFilePath);
  const sizeBytes = BigInt(stats.size);
  const description = extractDescriptionFromFAB(fileBuffer);

  return { fileName, sizeBytes, description };
}

function extractDescriptionFromFAB(buffer: Buffer): string | null {
  try {
    const files = unzipSync(new Uint8Array(buffer));
    const toml = files['pyproject.toml'];
    if (!toml) return null;

    const content = new TextDecoder().decode(toml);
    const match = content.match(/^\s*description\s*=\s*"([^"]+)"/m);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
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
