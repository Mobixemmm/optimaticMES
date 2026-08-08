import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBomItemDto {
  @ApiProperty({ example: 'Obudowa ABS 120mm' })
  @IsString()
  @MaxLength(200)
  productName: string;

  @ApiProperty({ example: 4, description: 'ID pozycji magazynowej (materiału)' })
  @IsInt()
  inventoryItemId: number;

  @ApiProperty({ example: 0.25, description: 'Zużycie na jedną sztukę wyrobu' })
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  quantityPer: number;

  @ApiPropertyOptional({ example: 'Tylko granulat z certyfikatem' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  notes?: string;
}
