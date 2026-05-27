import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterAdminDto } from './dto/register-admin.dto';

@ApiTags('Auth')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth-admin/register')
  @ApiOperation({ summary: 'Create an admin account for the assessment build' })
  @ApiCreatedResponse({ description: 'Admin account created successfully' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiConflictResponse({ description: 'Email already exists' })
  register(@Body() registerAdminDto: RegisterAdminDto) {
    // AuthController admin registration route:
    // Delegate the full admin account creation flow to the auth service and return its response payload unchanged.
    return this.authService.registerAdmin(registerAdminDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Log in an admin or verified merchant and issue a JWT access token',
  })
  @ApiOkResponse({
    description: 'Login successful with role-specific response payload',
  })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @ApiForbiddenResponse({
    description:
      'Merchant account is awaiting admin verification or account is inactive',
  })
  login(@Body() loginDto: LoginDto) {
    // AuthController shared login route:
    // Delegate authentication to the auth service so it can return the correct response shape for the authenticated role.
    return this.authService.login(loginDto);
  }
}
