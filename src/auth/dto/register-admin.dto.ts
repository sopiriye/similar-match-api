import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Equals, IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterAdminDto {
  @ApiProperty({ example: 'Sopiriye' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Robinson' })
  @IsString()
  lastName!: string;

  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPassword123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: UserRole.ADMIN, enum: UserRole })
  @Equals(UserRole.ADMIN, { message: 'role must be ADMIN' })
  role!: UserRole;
}
