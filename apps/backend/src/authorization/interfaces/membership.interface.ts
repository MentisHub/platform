import { OrgRole, ProjectRole } from 'prisma/generated/prisma/enums';

export interface OrganizationMembership {
  role?: OrgRole;
  isOwner: boolean;
}

export interface ProjectMembership {
  role: ProjectRole;
}
