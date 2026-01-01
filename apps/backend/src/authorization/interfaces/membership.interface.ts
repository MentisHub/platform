import { OrgRole, ProjectRole } from '@prisma/client';

export interface OrganizationMembership {
  organizationId: string;
  role?: OrgRole;
  isOwner: boolean;
}

export interface ProjectMembership {
  projectId: string;
  role: ProjectRole;
}
