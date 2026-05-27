import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class AuthTokenService {
  constructor(private readonly jwtService: JwtService) {}

  sign(payload: AuthTokenPayload): Promise<string> {
    // AuthTokenService token issuance flow:
    // Delegate JWT creation to Nest's JwtService so expiration, signature, and claim handling stay centralized.
    return this.jwtService.signAsync(payload);
  }
}
