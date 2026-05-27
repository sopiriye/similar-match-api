import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { RoleAuthResponseHandler } from '../interfaces/role-auth-response-handler.interface';
import { AdminRoleAuthResponseHandler } from './admin-role-auth-response.handler';
import { MerchantRoleAuthResponseHandler } from './merchant-role-auth-response.handler';

@Injectable()
export class RoleAuthFactory {
  private readonly handlers: RoleAuthResponseHandler[];

  constructor(
    adminRoleAuthResponseHandler: AdminRoleAuthResponseHandler,
    merchantRoleAuthResponseHandler: MerchantRoleAuthResponseHandler,
  ) {
    // RoleAuthFactory registration flow:
    // Register the available role-specific response builders once so login can resolve them without branching in the service.
    this.handlers = [
      adminRoleAuthResponseHandler,
      merchantRoleAuthResponseHandler,
    ];
  }

  get(role: UserRole): RoleAuthResponseHandler {
    // RoleAuthFactory resolution flow:
    // Locate the response builder that knows how to construct the login payload for the authenticated role.
    const handler = this.handlers.find((candidate) => candidate.supports(role));

    if (!handler) {
      throw new UnauthorizedException(
        `Unsupported role for login response: ${role}`,
      );
    }

    return handler;
  }
}
