import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOperatorDto {
  @ApiProperty({ example: 'Jan' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Kowalski' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'A3F29B1C4D5E' })
  @IsString()
  rfidCardId: string;

  @ApiProperty({
    example: '1234',
    description: 'PIN (4-8 cyfr) — drugi składnik logowania RFID, zapisywany jako hash',
  })
  @Matches(/^\d{4,8}$/, { message: 'PIN musi mieć 4-8 cyfr' })
  pinCode: string;

  @ApiPropertyOptional({ example: 'Operator CNC' })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({ example: 'CNC-01' })
  @IsString()
  @IsOptional()
  station?: string;

  @ApiPropertyOptional({ example: 'II' })
  @IsString()
  @IsOptional()
  shift?: string;

  @ApiPropertyOptional({ example: 92 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  efficiencyPct?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
