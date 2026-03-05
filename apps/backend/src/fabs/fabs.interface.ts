export interface UploadFabInput {
  organizationId: string;
  userId: string;
  description?: string;
  isPublic?: boolean;
  projectId?: string;
  fileBuffer: Buffer;
  originalname: string;
  size: number;
}

export interface UploadDefaultFabInput {
  userId: string;
  description?: string;
  isPublic?: boolean;
  fileBuffer: Buffer;
  originalname: string;
  size: number;
}
