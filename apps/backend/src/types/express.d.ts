import { JwtPayload } from 'src/authentication/interfaces/jwt-payload.interface';
import {
  OrganizationMembership,
  ProjectMembership,
} from 'src/authorization/interfaces/membership.interface';

declare global {
  namespace Express {
    interface Request {
      jwtPayload?: JwtPayload;
      orgMembership?: OrganizationMembership;
      projectMembership?: ProjectMembership;
    }
  }
}
