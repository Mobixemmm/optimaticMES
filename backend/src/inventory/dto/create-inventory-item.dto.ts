import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInventoryItemDto {
  @ApiProperty({ example: 'AL-220' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Blacha aluminiowa 2mm' })
  @IsString()
  name: string;

  @ApiProperty({ example: 420 })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({ example: 'szt.' })
  @IsString()
  unit: string;

  @ApiProperty({ example: 200 })
  @IsNumber()
  @Min(0)
  minStock: number;

  @ApiPropertyOptional({ example: 'Surowce' })
  @IsString()
  @IsOptional()
  category?: string;
}
