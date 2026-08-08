import { IsString, IsInt, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
  @IsString()
  orderNumber: string;

  @IsString()
  productName: string;

  @IsInt()
  quantity: number;

  @ApiPropertyOptional({
    example: 42.5,
    description: 'Wzorcowy czas cyklu (s/szt.) — potrzebny do liczenia OEE Performance',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  idealCycleTimeSec?: number;

  @IsEnum(['pending', 'in_progress', 'completed', 'cancelled'])
  @IsOptional()
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';

  @IsOptional()
  plannedStart?: Date;

  @IsOptional()
  actualStart?: Date;

  @IsOptional()
  actualEnd?: Date;
}
