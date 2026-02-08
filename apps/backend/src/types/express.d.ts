import {
  NodePayloadData,
  TokenType,
  UserPayloadData,
} from 'src/authentication/interfaces/payload.interface';
import {
  OrganizationMembership,
  ProjectMembership,
} from 'src/authorization/interfaces/membership.interface';

type AuthContext =
  | { kind: TokenType.BEARER; payload: UserPayloadData }
  | { kind: TokenType.NODE; payload: NodePayloadData };

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      orgMembership?: OrganizationMembership;
      projectMembership?: ProjectMembership;
    }
  }
}
