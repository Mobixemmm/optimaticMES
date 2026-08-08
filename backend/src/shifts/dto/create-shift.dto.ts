import { IsString, IsInt, IsBoolean, IsOptional, Matches, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShiftDto {
  @ApiProperty({ example: 'Zmiana I' })
  @IsString()
  name: string;

  @ApiProperty({ example: 1, description: '0 = niedziela ... 6 = sobota' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ example: '06:00' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Format HH:mm' })
  startTime: string;

  @ApiProperty({ example: '14:00' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Format HH:mm' })
  endTime: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
