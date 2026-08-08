import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { StopReason } from '../../entities/machine-stop-event.entity';

const REASONS: StopReason[] = [
  'failure',
  'setup',
  'material',
  'micro_stop',
  'quality',
  'planned',
];

export class StartMachineStopDto {
  @ApiProperty({ enum: REASONS })
  @IsEnum(REASONS)
  reason: StopReason;

  @ApiPropertyOptional({ example: 'Brak sygnału bezpieczeństwa' })
  @IsString()
  @IsOptional()
  notes?: string;
}
