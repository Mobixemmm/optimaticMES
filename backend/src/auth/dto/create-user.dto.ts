import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { UserRole } from '../../entities/user.entity';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  // Bez @IsEnum: role żyją w bazie i klient może mieć własne. Istnienie roli
  // w obrębie tenanta sprawdza AuthService.assertRoleExists().
  @ApiProperty({ example: 'contributor', description: 'Kod roli z tabeli roles' })
  @IsString()
  @MinLength(2)
  role: UserRole;
}
