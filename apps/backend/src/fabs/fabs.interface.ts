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

export interface UploadDefaultFabInput {
  userId: string;
  description?: string;
  isPublic?: boolean;
  tags?: string[];
  fileBuffer: Buffer;
  originalname: string;
  size: number;
}
