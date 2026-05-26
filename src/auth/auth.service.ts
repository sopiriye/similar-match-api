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
    if (registerAdminDto.role !== UserRole.ADMIN) {
      throw new BadRequestException('role must be ADMIN');
    }

    const email = this.normalizeEmail(registerAdminDto.email);
    const existingUser = await this.databaseService.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

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

    return {
      message: 'Account created successfully',
      user,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateCredentials(
      loginDto.email,
      loginDto.password,
    );
    const accessToken = await this.authTokenService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    const responseHandler = this.roleAuthFactory.get(user.role);

    return responseHandler.buildLoginResponse({
      accessToken,
      user,
    });
  }

  private async validateCredentials(
    emailAddress: string,
    password: string,
  ): Promise<LoginUser> {
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

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is inactive');
    }

    const passwordMatches = await this.passwordService.verify(
      password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (
      user.role === UserRole.MERCHANT &&
      user.merchantProfile?.status !== MerchantStatus.VERIFIED
    ) {
      throw new ForbiddenException(
        'Merchant account is awaiting admin verification',
      );
    }

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
