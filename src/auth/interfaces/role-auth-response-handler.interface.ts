import { UserRole } from '@prisma/client';
import { LoginContext } from './login-context.interface';

export interface RoleAuthResponseHandler {
  supports(role: UserRole): boolean;
  buildLoginResponse(context: LoginContext): unknown;
}
