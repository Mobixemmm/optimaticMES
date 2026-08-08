import { IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBomItemDto {
  @ApiPropertyOptional({ example: 0.3 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  @IsOptional()
  quantityPer?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(255)
  notes?: string;
}
