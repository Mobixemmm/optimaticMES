import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  DefectCode,
  DefectDisposition,
} from '../../entities/quality-defect.entity';

const DEFECT_CODES: DefectCode[] = [
  'dimension',
  'surface',
  'material',
  'assembly',
  'contamination',
  'labeling',
  'other',
];

const DISPOSITIONS: DefectDisposition[] = ['scrap', 'rework'];

export class CreateQualityDefectDto {
  @ApiProperty({ example: 12, description: 'ID zlecenia, na którym wykryto wadę' })
  @IsInt()
  orderId: number;

  @ApiProperty({ enum: DEFECT_CODES })
  @IsEnum(DEFECT_CODES)
  defectCode: DefectCode;

  @ApiProperty({ example: 3, description: 'Liczba sztuk objętych wadą' })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({
    enum: DISPOSITIONS,
    description: 'scrap = brak nie do uratowania, rework = do poprawki',
  })
  @IsEnum(DISPOSITIONS)
  disposition: DefectDisposition;

  @ApiPropertyOptional({ example: 'PRESS-01' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  machineId?: string;

  @ApiPropertyOptional({ example: 'A. Kowalski' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  detectedBy?: string;

  @ApiPropertyOptional({ example: 'Rysa na powierzchni czołowej' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  notes?: string;
}
