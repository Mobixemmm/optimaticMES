import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReportScrapDto {
  @ApiProperty({ example: 'PRESS-01' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  machineId: string;

  @ApiProperty({ example: 3, description: 'Liczba sztuk odrzutu.' })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 'MATERIAL', description: 'Kod przyczyny z katalogu.' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  categoryCode: string;

  @ApiPropertyOptional({
    description:
      'Zlecenie, w które wpada odrzut. Pominięte = serwis dobiera zlecenie otwarte na tej maszynie.',
  })
  @IsOptional()
  @IsInt()
  orderId?: number;

  @ApiPropertyOptional({ description: 'Operator zgłaszający (z sesji na panelu).' })
  @IsOptional()
  @IsInt()
  operatorId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}

export class ReclassifyScrapDto {
  @ApiProperty({ example: 'MACHINE' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  categoryCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  notes?: string;
}
