import { IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConnectionDto {
  @ApiProperty({ example: 'rest-generic', description: 'Klucz konektora z rejestru' })
  @IsString()
  @MaxLength(60)
  connectorKey: string;

  @ApiProperty({ example: 'ERP produkcja' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ description: 'Pola jawne konektora' })
  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Pola wrażliwe (hasła, klucze API). Nigdy nie są zwracane z powrotem.',
  })
  @IsObject()
  @IsOptional()
  secrets?: Record<string, string>;
}

export class UpdateConnectionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;

  // Pominięcie pola zachowuje dotychczasowy sekret; pusty string go kasuje.
  // Bez tego rozróżnienia każda edycja nazwy wymagałaby ponownego wpisywania hasła.
  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  secrets?: Record<string, string>;
}
