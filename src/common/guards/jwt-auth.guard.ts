import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = AuthenticatedUser>(
    err: Error | null,
    user: TUser | false | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _info?: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _context?: ExecutionContext,
  ): TUser {
    // JwtAuthGuard request protection flow:
    // Normalize Passport's authentication result so protected routes fail with one consistent unauthorized response.
    if (err || !user) {
      throw err ?? new UnauthorizedException('Invalid or expired access token');
    }

    return user;
  }
}
