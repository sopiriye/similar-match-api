import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // RolesGuard metadata resolution flow:
    // Resolve the role requirements declared on the route handler or controller before checking the request user.
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    // RolesGuard authorization flow:
    // Read the authenticated request user that the JWT strategy attached during the authentication phase.
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // RolesGuard authorization flow:
    // Reject authenticated users whose role does not satisfy the route-level role constraint.
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role for this resource');
    }

    return true;
  }
}
