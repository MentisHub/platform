import { SetMetadata } from '@nestjs/common';
import { OrgRole, ProjectRole } from '@prisma/client';

export const ORG_ROLES_KEY = 'org_roles';
export const PROJECT_ROLES_KEY = 'project_roles';

export const RequireOrgRole = (...roles: OrgRole[]) =>
  SetMetadata(ORG_ROLES_KEY, roles);

export const RequireProjectRole = (...roles: ProjectRole[]) =>
  SetMetadata(PROJECT_ROLES_KEY, roles);
