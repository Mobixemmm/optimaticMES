import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AndonTone } from '../../entities/andon-alert.entity';

const TONES: AndonTone[] = ['err', 'warn', 'info'];

export class CreateAndonAlertDto {
  @ApiProperty({ example: 'Awaria' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ example: 'Robot RB-07' })
  @IsString()
  @IsOptional()
  machineId?: string;

  @ApiProperty({ example: 'Robot RB-07 — brak sygnału bezpieczeństwa' })
  @IsString()
  message: string;

  @ApiProperty({ enum: TONES })
  @IsEnum(TONES)
  tone: AndonTone;
}
