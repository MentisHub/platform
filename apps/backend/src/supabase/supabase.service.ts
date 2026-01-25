import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private client!: SupabaseClient<any, any, 'public', any, any>;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.config.getOrThrow<string>('SUPABASE_URL');
    const supabaseKey = this.config.getOrThrow<string>('SUPABASE_SERVICE_KEY');

    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    });

    this.logger.log('Supabase client initialized');
  }

  getClient(): SupabaseClient<any, any, 'public', any, any> {
    return this.client;
  }

  async uploadFile(
    bucket: string,
    path: string,
    file: Buffer,
    options?: { contentType?: string; upsert?: boolean },
  ): Promise<void> {
    const { error } = await this.client.storage
      .from(bucket)
      .upload(path, file, {
        contentType: options?.contentType ?? 'application/octet-stream',
        upsert: options?.upsert ?? true,
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async downloadFile(bucket: string, path: string): Promise<Buffer> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .download(path);

    if (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await this.client.storage.from(bucket).remove([path]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  async createBucket(
    name: string,
    options?: { public?: boolean; fileSizeLimit?: number },
  ): Promise<void> {
    const { error } = await this.client.storage.createBucket(name, {
      public: options?.public ?? false,
      fileSizeLimit: options?.fileSizeLimit,
    });

    if (error && error.message !== 'Bucket already exists') {
      throw new Error(`Failed to create bucket: ${error.message}`);
    }
  }
}
