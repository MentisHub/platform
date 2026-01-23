/**
 * Mock Supabase Storage
 */
export const createMockSupabaseStorage = () => ({
  from: jest.fn().mockReturnValue({
    upload: jest
      .fn()
      .mockResolvedValue({ data: { path: 'mock/path' }, error: null }),
    download: jest.fn().mockResolvedValue({
      data: new Blob(['mock content']),
      error: null,
    }),
    remove: jest.fn().mockResolvedValue({ data: [], error: null }),
    list: jest.fn().mockResolvedValue({ data: [], error: null }),
    getPublicUrl: jest.fn().mockReturnValue({
      data: {
        publicUrl:
          'https://mock.supabase.co/storage/v1/object/public/bucket/path',
      },
    }),
  }),
  createBucket: jest
    .fn()
    .mockResolvedValue({ data: { name: 'mock-bucket' }, error: null }),
  getBucket: jest
    .fn()
    .mockResolvedValue({ data: { name: 'mock-bucket' }, error: null }),
  listBuckets: jest.fn().mockResolvedValue({ data: [], error: null }),
  deleteBucket: jest.fn().mockResolvedValue({ data: null, error: null }),
});

/**
 * Mock Supabase Client
 */
export const createMockSupabaseClient = () => ({
  storage: createMockSupabaseStorage(),
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: jest
      .fn()
      .mockResolvedValue({ data: { user: null }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
  },
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  }),
});

/**
 * Mock SupabaseService for NestJS DI
 */
export type MockSupabaseService = {
  getClient: jest.Mock;
  uploadFile: jest.Mock;
  downloadFile: jest.Mock;
  deleteFile: jest.Mock;
  createBucket: jest.Mock;
  onModuleInit: jest.Mock;
};

export const createMockSupabaseService = (): MockSupabaseService => {
  const mockClient = createMockSupabaseClient();

  return {
    getClient: jest.fn().mockReturnValue(mockClient),
    uploadFile: jest.fn().mockResolvedValue(undefined),
    downloadFile: jest.fn().mockResolvedValue(Buffer.from('mock file content')),
    deleteFile: jest.fn().mockResolvedValue(undefined),
    createBucket: jest.fn().mockResolvedValue(undefined),
    onModuleInit: jest.fn(),
  };
};

/**
 * Reset all Supabase mocks
 */
export const resetSupabaseMocks = (supabaseService: MockSupabaseService) => {
  supabaseService.getClient.mockClear();
  supabaseService.uploadFile.mockClear();
  supabaseService.downloadFile.mockClear();
  supabaseService.deleteFile.mockClear();
  supabaseService.createBucket.mockClear();
};

/**
 * Helper to mock upload error
 */
export const mockUploadError = (
  supabaseService: MockSupabaseService,
  errorMessage: string,
) => {
  supabaseService.uploadFile.mockRejectedValueOnce(
    new Error(`Failed to upload file: ${errorMessage}`),
  );
};

/**
 * Helper to mock download error
 */
export const mockDownloadError = (
  supabaseService: MockSupabaseService,
  errorMessage: string,
) => {
  supabaseService.downloadFile.mockRejectedValueOnce(
    new Error(`Failed to download file: ${errorMessage}`),
  );
};

/**
 * Helper to mock file content for download
 */
export const mockFileContent = (
  supabaseService: MockSupabaseService,
  content: Buffer | string,
) => {
  const buffer = typeof content === 'string' ? Buffer.from(content) : content;
  supabaseService.downloadFile.mockResolvedValueOnce(buffer);
};
