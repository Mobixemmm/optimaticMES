import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConsumeMaterialDto {
  @ApiProperty({ example: 12, description: 'Zlecenie, na które wydano materiał' })
  @IsInt()
  orderId: number;

  @ApiProperty({ example: 4 })
  @IsInt()
  inventoryItemId: number;

  @ApiProperty({
    example: 'LOT-2026-0345',
    description: 'Numer partii dostawcy — bez niego genealogia nie ma sensu',
  })
  @IsString()
  @MaxLength(100)
  batchNumber: string;

  @ApiProperty({ example: 25.5 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({ example: 'A. Kowalski' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  consumedBy?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  notes?: string;
}
