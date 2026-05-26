import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { LoginContext } from '../interfaces/login-context.interface';
import { RoleAuthResponseHandler } from '../interfaces/role-auth-response-handler.interface';

@Injectable()
export class AdminRoleAuthResponseHandler implements RoleAuthResponseHandler {
  supports(role: UserRole): boolean {
    return role === UserRole.ADMIN;
  }

  //NB: there should be proper error handling for the case where support is called false or with a role that is not supported, but for simplicity, we assume the factory will only call this method if supports() returns true.

  buildLoginResponse(context: LoginContext) {
    return {
      accessToken: context.accessToken,
      user: {
        id: context.user.id,
        email: context.user.email,
        role: context.user.role,
      },
    };
  }
}
