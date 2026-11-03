import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// machine_data to hypertable z telemetrią — limit bez górnej granicy pozwalał
// jednym żądaniem (?limit=10000000) wyciągnąć całą historię i zablokować bazę.
export const MACHINE_DATA_MAX_LIMIT = 1000;

export class MachineDataLimitQueryDto {
  @ApiPropertyOptional({
    default: 100,
    minimum: 1,
    maximum: MACHINE_DATA_MAX_LIMIT,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MACHINE_DATA_MAX_LIMIT)
  @IsOptional()
  limit?: number;
}

export class MachineDataLatestQueryDto extends MachineDataLimitQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  machineId?: string;
}
