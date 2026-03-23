export interface UploadFabInput {
  organizationId: string;
  userId: string;
  description?: string;
  isPublic?: boolean;
  tags?: string[];
  projectId?: string;
  fileBuffer: Buffer;
  originalname: string;
  size: number;
}

export interface ListFabsOptions {
  projectId?: string;
  tags?: string[];
  search?: string;
  includeDefault?: boolean;
  includePublic?: boolean;
  sortBy?: 'name' | 'createdAt' | 'version';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface UploadDefaultFabInput {
  userId: string;
  description?: string;
  isPublic?: boolean;
  tags?: string[];
  fileBuffer: Buffer;
  originalname: string;
  size: number;
}
