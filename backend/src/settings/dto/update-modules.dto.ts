import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ModulePatchDto {
  @ApiProperty({ example: 'orders' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  key: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: 'Loty', description: 'Nazwa modułu w menu' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string | null;

  @ApiPropertyOptional({ example: 'Plane', description: 'Nazwa ikony lucide-react' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  icon?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  // Scalane z dotychczasową konfiguracją — wystarczy przysłać zmieniony klucz.
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class UpdateModulesDto {
  @ApiPropertyOptional({
    description: 'Nadpisanie dla jednego zakładu; pominięte = ustawienie globalne klienta',
  })
  @IsOptional()
  @IsInt()
  siteId?: number | null;

  @ApiProperty({ type: [ModulePatchDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModulePatchDto)
  modules: ModulePatchDto[];
}
