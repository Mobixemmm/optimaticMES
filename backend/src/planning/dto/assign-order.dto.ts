import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignOrderDto {
  @ApiPropertyOptional({
    example: 'PRESS-01',
    description: 'Maszyna. Pominięcie albo null zdejmuje zlecenie z planu.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  machineId?: string | null;

  @ApiPropertyOptional({ example: 10, description: 'Pozycja w kolejce maszyny' })
  @IsInt()
  @Min(0)
  @IsOptional()
  sequence?: number;

  @ApiPropertyOptional({ example: '2026-08-10T06:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  plannedStart?: string;
}

export class ReorderQueueDto {
  @ApiProperty({ example: 'PRESS-01' })
  @IsString()
  @MaxLength(100)
  machineId: string;

  @ApiProperty({
    example: [12, 8, 3],
    description: 'Identyfikatory zleceń w docelowej kolejności',
  })
  @IsArray()
  @IsInt({ each: true })
  orderIds: number[];
}
