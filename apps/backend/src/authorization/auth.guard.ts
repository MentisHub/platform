import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { OrgRole, ProjectRole } from 'prisma/generated/prisma/enums';
import { AuthorizationService } from './auth.service';
import { ErrorCode } from '@platform/contracts';
import { ORG_ROLES_KEY, PROJECT_ROLES_KEY } from './decorators/roles.decorator';

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

    if (requiredOrgRoles) {
      await this.validateOrgAccess(request, userId, requiredOrgRoles);
    }

    if (requiredProjectRoles) {
      await this.validateProjectAccess(request, userId, requiredProjectRoles);
    }

    return true;
  }

  private async validateOrgAccess(
    request: Request,
    userId: string,
    requiredRoles: OrgRole[],
  ): Promise<void> {
    const organizationId = request.params.organizationId;

    if (!organizationId) return;

    const membership = await this.authService.getOrgMembership(
      organizationId,
      userId,
    );

    if (!membership) {
      throw new ForbiddenException({
        statusCode: 403,
        code: ErrorCode.NOT_ORGANIZATION_MEMBER,
        message: 'Not a member of this organization',
      });
    }

    if (!membership.role || !requiredRoles.includes(membership.role)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: ErrorCode.INSUFFICIENT_PERMISSIONS,
        message: `Requires one of: ${requiredRoles.join(', ')}`,
      });
    }

    request.orgMembership = membership;
  }

  private async validateProjectAccess(
    request: Request,
    userId: string,
    requiredRoles: ProjectRole[],
  ): Promise<void> {
    const projectId = request.params.projectId;
    if (!projectId) return;

    const membership = await this.authService.getProjectMembership(
      projectId,
      userId,
    );

    if (!membership) {
      throw new ForbiddenException({
        statusCode: 403,
        code: ErrorCode.NOT_PROJECT_MEMBER,
        message: 'No access to this project',
      });
    }

    if (!membership.role || !requiredRoles.includes(membership.role)) {
      throw new ForbiddenException({
        statusCode: 403,
        code: ErrorCode.INSUFFICIENT_PERMISSIONS,
        message: `Requires one of: ${requiredRoles.join(', ')}`,
      });
    }

    request.projectMembership = membership;
  }
}
