import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { UserRole } from '../../entities/user.entity';

export class UpdateUserRoleDto {
  // Patrz komentarz w CreateUserDto — lista ról nie jest zamknięta w kodzie.
  @ApiProperty({ example: 'viewer', description: 'Kod roli z tabeli roles' })
  @IsString()
  @MinLength(2)
  role: UserRole;
}
