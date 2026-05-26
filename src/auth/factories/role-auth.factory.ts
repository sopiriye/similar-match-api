import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AdminRoleAuthResponseHandler } from './admin-role-auth-response.handler';
import { MerchantRoleAuthResponseHandler } from './merchant-role-auth-response.handler';
import { RoleAuthResponseHandler } from '../interfaces/role-auth-response-handler.interface';

@Injectable()
export class RoleAuthFactory {
  private readonly handlers: RoleAuthResponseHandler[];

  constructor(
    adminRoleAuthResponseHandler: AdminRoleAuthResponseHandler,
    merchantRoleAuthResponseHandler: MerchantRoleAuthResponseHandler,
  ) {
    this.handlers = [
      adminRoleAuthResponseHandler,
      merchantRoleAuthResponseHandler,
    ];
  }

  get(role: UserRole): RoleAuthResponseHandler {
    const handler = this.handlers.find((candidate) => candidate.supports(role));

    if (!handler) {
      throw new UnauthorizedException(
        `Unsupported role for login response: ${role}`,
      );
    }

    return handler;
  }
}
