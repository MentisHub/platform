import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';

export function createSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables',
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function uploadFABToStorage(
  filePath: string,
  bucketKey: string,
): Promise<string> {
  const supabase = createSupabaseAdmin();
  const bucketName = process.env.FAB_STORAGE_BUCKET || 'fab';

  const fileContent = await readFile(filePath);

  const { error } = await supabase.storage
    .from(bucketName)
    .upload(bucketKey, fileContent, {
      contentType: 'application/octet-stream',
      upsert: true, // Overwrite if exists
    });

  if (error) {
    console.error(`Failed to upload FAB to storage: ${error.message}`);
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(bucketKey);

  return publicUrlData.publicUrl;
}

export async function deleteFABFromStorage(bucketKey: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const bucketName = process.env.FAB_STORAGE_BUCKET || 'fab';

  const { error } = await supabase.storage.from(bucketName).remove([bucketKey]);

  if (error) {
    console.warn(`Failed to delete FAB from storage: ${error.message}`);
  }
}
