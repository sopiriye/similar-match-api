import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { LoginContext } from '../interfaces/login-context.interface';
import { RoleAuthResponseHandler } from '../interfaces/role-auth-response-handler.interface';

@Injectable()
export class MerchantRoleAuthResponseHandler implements RoleAuthResponseHandler {
  supports(role: UserRole): boolean {
    return role === UserRole.MERCHANT;
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
      merchant: context.user.merchantProfile
        ? {
            id: context.user.merchantProfile.id,
            businessName: context.user.merchantProfile.businessName,
            status: context.user.merchantProfile.status,
            verifiedAt: context.user.merchantProfile.verifiedAt,
          }
        : null,
    };
  }
}
