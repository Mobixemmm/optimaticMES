import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@optimatic.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'adminadmin' })
  @IsString()
  @MinLength(6)
  password: string;
}
