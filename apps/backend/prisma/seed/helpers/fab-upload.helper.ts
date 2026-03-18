import { readFile, stat } from 'fs/promises';
import { basename } from 'path';
import { unzipSync } from 'fflate';

export interface FABFileMetadata {
  fileName: string;
  sizeBytes: bigint;
  description: string | null;
  tags: string[];
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
  const { description, tags } = extractMetadataFromFAB(fileBuffer);

  return { fileName, sizeBytes, description, tags };
}

function extractMetadataFromFAB(buffer: Buffer): { description: string | null; tags: string[] } {
  try {
    const files = unzipSync(new Uint8Array(buffer));
    const toml = files['pyproject.toml'];
    if (!toml) return { description: null, tags: [] };

    const content = new TextDecoder().decode(toml);

    const descMatch = content.match(/^\s*description\s*=\s*"([^"]+)"/m);
    const description = descMatch?.[1] ?? null;

    const tagsMatch = content.match(/\[tool\.mentishub\][^\[]*tags\s*=\s*\[([^\]]*)\]/s);
    const tags = tagsMatch
      ? tagsMatch[1].match(/"([^"]+)"/g)?.map((t) => t.replace(/"/g, '')) ?? []
      : [];

    return { description, tags };
  } catch {
    return { description: null, tags: [] };
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
