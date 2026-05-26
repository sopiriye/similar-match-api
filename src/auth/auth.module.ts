import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { getJwtExpiresIn, getJwtSecret } from './auth.constants';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';
import { AdminRoleAuthResponseHandler } from './factories/admin-role-auth-response.handler';
import { MerchantRoleAuthResponseHandler } from './factories/merchant-role-auth-response.handler';
import { RoleAuthFactory } from './factories/role-auth.factory';
import { JwtStrategy } from './jwt.strategy';
import { PasswordService } from './password.service';

@Module({
  imports: [
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: {
        expiresIn: getJwtExpiresIn(),
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokenService,
    PasswordService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    RoleAuthFactory,
    AdminRoleAuthResponseHandler,
    MerchantRoleAuthResponseHandler,
  ],
  exports: [
    AuthService,
    AuthTokenService,
    PasswordService,
    PassportModule,
    JwtModule,
    JwtAuthGuard,
    RolesGuard,
    RoleAuthFactory,
  ],
})
export class AuthModule {}
