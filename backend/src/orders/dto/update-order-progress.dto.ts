import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateOrderProgressDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  producedQuantity?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  scrapQuantity?: number;
}
