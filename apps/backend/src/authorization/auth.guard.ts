import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCode } from '@platform/contracts';
import { Request } from 'express';
import { AuthorizationService } from './auth.service';
import { ORG_ROLES_KEY, PROJECT_ROLES_KEY } from './decorators/roles.decorator';
import { OrgRole, ProjectRole } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthorizationService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const requiredOrgRoles = this.reflector.getAllAndOverride<OrgRole[]>(
      ORG_ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    const requiredProjectRoles = this.reflector.getAllAndOverride<
      ProjectRole[]
    >(PROJECT_ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);

    if (!requiredOrgRoles && !requiredProjectRoles) {
      return true;
    }

    const request = ctx.switchToHttp().getRequest<Request>();

    if (!request.jwtPayload) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: ErrorCode.AUTHENTICATION_REQUIRED,
        message: 'Authentication required',
      });
    }

    const userId = request.jwtPayload.sub;
    let organizationId = request.params.organizationId;

    if (!organizationId && request.params.projectId) {
      const orgId = await this.authService.getOrganizationIdByProject(
        request.params.projectId,
      );
      if (!orgId) return false;
      organizationId = orgId;
    }

    if (!organizationId) return false;

    const membership = await this.authService.getOrgMembership(
      organizationId,
      userId,
    );
    request.orgMembership = membership ?? undefined;

    // Owner and ADMIN have full access to organization
    if (membership?.isOwner || membership?.role === OrgRole.ADMIN) return true;

    if (requiredOrgRoles) {
      if (!membership) {
        throw new ForbiddenException({
          code: ErrorCode.NOT_ORGANIZATION_MEMBER,
          message: 'Not a member of this organization',
        });
      }

      if (!membership.role || !requiredOrgRoles.includes(membership.role)) {
        throw new ForbiddenException({
          code: ErrorCode.INSUFFICIENT_PERMISSIONS,
          message: `Requires one of: ${requiredOrgRoles.join(', ')}`,
        });
      }
    }

    if (requiredProjectRoles) {
      const projectId = request.params.projectId;
      if (!projectId) return false;

      const projectMembership = await this.authService.getProjectMembership(
        projectId,
        userId,
      );
      request.projectMembership = projectMembership ?? undefined;

      if (!projectMembership) {
        throw new ForbiddenException({
          code: ErrorCode.NOT_PROJECT_MEMBER,
          message: 'No access to this project',
        });
      }

      if (
        !projectMembership.role ||
        !requiredProjectRoles.includes(projectMembership.role)
      ) {
        throw new ForbiddenException({
          code: ErrorCode.INSUFFICIENT_PERMISSIONS,
          message: `Requires one of: ${requiredProjectRoles.join(', ')}`,
        });
      }
    }

    return true;
  }
}
