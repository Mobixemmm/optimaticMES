import { IsString, IsOptional, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMachineDto {
  @ApiProperty({ example: 'CNC-03', description: 'Identyfikator używany przez telemetrię' })
  @IsString()
  machineId: string;

  @ApiProperty({ example: 'Frezarka CNC 03' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Zakład, w którym stoi maszyna' })
  @IsNumber()
  @IsOptional()
  siteId?: number;

  @ApiPropertyOptional({ description: 'Obszar wewnątrz zakładu (linia, hala, strefa)' })
  @IsNumber()
  @IsOptional()
  areaId?: number;

  @ApiPropertyOptional({ example: 'Linia LN-08' })
  @IsString()
  @IsOptional()
  line?: string;

  @ApiPropertyOptional({ example: 85 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  targetOeePct?: number;

  @ApiPropertyOptional({ example: 42.5, description: 'Wzorcowy czas cyklu (s/szt.)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  defaultIdealCycleTimeSec?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
