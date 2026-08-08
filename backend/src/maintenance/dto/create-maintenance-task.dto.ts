import { IsString, IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type {
  MaintenancePriority,
  MaintenanceStatus,
} from '../../entities/maintenance-task.entity';

const PRIORITIES: MaintenancePriority[] = ['critical', 'high', 'medium', 'low'];
const STATUSES: MaintenanceStatus[] = ['open', 'in_progress', 'done'];

export class CreateMaintenanceTaskDto {
  @ApiProperty({ example: 'MT-104' })
  @IsString()
  taskNumber: string;

  @ApiProperty({ example: 'Robot RB-07' })
  @IsString()
  asset: string;

  @ApiProperty({ example: 'Naprawa awaryjna' })
  @IsString()
  type: string;

  @ApiProperty({ example: '2026-08-01T08:00:00.000Z' })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ example: 'R. Malinowski' })
  @IsString()
  technician: string;

  @ApiProperty({ enum: PRIORITIES })
  @IsEnum(PRIORITIES)
  priority: MaintenancePriority;

  @ApiPropertyOptional({ enum: STATUSES })
  @IsEnum(STATUSES)
  @IsOptional()
  status?: MaintenanceStatus;
}
