import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { getJwtSecret } from './auth.constants';
import { AuthTokenPayload } from './auth-token.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    // JwtStrategy configuration flow:
    // Configure Passport to extract bearer tokens, enforce expiration, and verify signatures with the shared JWT secret.
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  validate(payload: AuthTokenPayload): AuthenticatedUser {
    // JwtStrategy validation flow:
    // Normalize the verified JWT payload into the request user shape consumed by guards and route handlers.
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
