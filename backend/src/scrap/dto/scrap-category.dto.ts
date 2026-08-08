import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateScrapCategoryDto {
  // Kod trafia do raportów i integracji z ERP, więc trzymamy go w jednym,
  // przewidywalnym kształcie zamiast pozwalać na spacje i polskie znaki.
  @ApiProperty({ example: 'MATERIAL' })
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Kod kategorii może zawierać tylko wielkie litery, cyfry i podkreślenie',
  })
  code: string;

  @ApiProperty({ example: 'Wada materiału' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  label: string;

  @ApiPropertyOptional({ example: 'Materiał' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  group?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateScrapCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  group?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
