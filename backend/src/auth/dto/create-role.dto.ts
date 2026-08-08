import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'shift_lead' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'Kod roli: małe litery, cyfry i podkreślenia, zaczynając od litery',
  })
  code: string;

  @ApiProperty({ example: 'Brygadzista zmiany' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  // Poprawność kluczy sprawdza RolesService wobec katalogu PERMISSIONS —
  // tu tylko kształt, żeby komunikat o nieznanym uprawnieniu był konkretny.
  @ApiProperty({ type: [String], example: ['orders.read', 'orders.create'] })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @ApiPropertyOptional({
    type: [Number],
    description: 'Ograniczenie do wskazanych zakładów; pominięte = wszystkie',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  siteScope?: number[];
}
