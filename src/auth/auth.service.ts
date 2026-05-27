import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { MerchantStatus, UserRole } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { RoleAuthFactory } from './factories/role-auth.factory';
import { AuthTokenService } from './auth-token.service';
import { LoginDto } from './dto/login.dto';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { LoginUser } from './interfaces/login-context.interface';
import { PasswordService } from './password.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly passwordService: PasswordService,
    private readonly authTokenService: AuthTokenService,
    private readonly roleAuthFactory: RoleAuthFactory,
  ) {}

  async registerAdmin(registerAdminDto: RegisterAdminDto) {
    // Admin registration flow:
    // Validate that this route is used only for admin account creation before touching persistence.
    if (registerAdminDto.role !== UserRole.ADMIN) {
      throw new BadRequestException('role must be ADMIN');
    }

    // Admin registration flow:
    // Normalize the email and reject duplicate credentials before hashing or creating the user.
    const email = this.normalizeEmail(registerAdminDto.email);
    const existingUser = await this.databaseService.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Admin registration flow:
    // Hash the password and persist the admin record that the login route will later authenticate.
    const passwordHash = await this.passwordService.hash(
      registerAdminDto.password,
    );
    const user = await this.databaseService.user.create({
      data: {
        firstName: registerAdminDto.firstName.trim(),
        lastName: registerAdminDto.lastName.trim(),
        email,
        passwordHash,
        role: UserRole.ADMIN,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    // Admin registration flow:
    // Return the minimal account creation payload expected by the controller response.
    return {
      message: 'Account created successfully',
      user,
    };
  }

  async login(loginDto: LoginDto) {
    // Shared login flow:
    // Authenticate the incoming credentials for either an admin or a merchant account.
    const user = await this.validateCredentials(
      loginDto.email,
      loginDto.password,
    );

    // Shared login flow:
    // Issue the JWT access token that protected routes will later validate through Passport.
    const accessToken = await this.authTokenService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    // Shared login flow:
    // Resolve the role-specific response builder so admin and merchant payloads can diverge cleanly.
    const responseHandler = this.roleAuthFactory.get(user.role);

    // Shared login flow:
    // Build and return the role-aware login response payload for the controller route.
    return responseHandler.buildLoginResponse({
      accessToken,
      user,
    });
  }

  private async validateCredentials(
    emailAddress: string,
    password: string,
  ): Promise<LoginUser> {
    // Credential validation flow:
    // Load the authentication record and linked merchant verification state needed for login checks.
    const email = this.normalizeEmail(emailAddress);
    const user = await this.databaseService.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        passwordHash: true,
        merchantProfile: {
          select: {
            id: true,
            businessName: true,
            status: true,
            verifiedAt: true,
          },
        },
      },
    });

    // Credential validation flow:
    // Fail early when the account does not exist or is currently disabled.
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is inactive');
    }

    // Credential validation flow:
    // Verify the supplied password against the stored password hash before allowing access.
    const passwordMatches = await this.passwordService.verify(
      password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Credential validation flow:
    // Enforce the merchant verification gate so only admin-approved merchants can log in.
    if (
      user.role === UserRole.MERCHANT &&
      user.merchantProfile?.status !== MerchantStatus.VERIFIED
    ) {
      throw new ForbiddenException(
        'Merchant account is awaiting admin verification',
      );
    }

    // Credential validation flow:
    // Return only the normalized login context needed by token issuance and response factories.
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      merchantProfile: user.merchantProfile,
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
}
