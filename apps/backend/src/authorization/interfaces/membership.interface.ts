import { OrgRole, ProjectRole } from 'prisma/generated/prisma/enums';

export interface OrganizationMembership {
  organizationId: string;
  role?: OrgRole;
  isOwner: boolean;
}

export interface ProjectMembership {
  projectId: string;
  role: ProjectRole;
}
