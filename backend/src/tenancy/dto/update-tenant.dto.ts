import { IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTenantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  // Nadpisania nazewnictwa, np. { "workItem": "Lot" }. Scalane z istniejącymi
  // (patrz TenancyService.updateTenant), więc wystarczy wysłać zmienione klucze.
  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'string' } })
  @IsOptional()
  @IsObject()
  terminology?: Record<string, string>;
}
