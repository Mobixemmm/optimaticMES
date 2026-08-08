import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SCRAP_SOURCES, type ScrapSourceSetting } from '../panel-modules.constants';

export class UpdateMachineConfigDto {
  @ApiPropertyOptional({
    type: [String],
    example: ['production', 'scrap', 'andon'],
    description:
      'Pełna lista kafelków HMI tej maszyny. Pusta tablica = panel bez kafelków; pominięcie pola = bez zmian.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  panelModules?: string[];

  @ApiPropertyOptional({ enum: SCRAP_SOURCES })
  @IsOptional()
  @IsIn(SCRAP_SOURCES)
  scrapSource?: ScrapSourceSetting;

  @ApiPropertyOptional({
    example: 'scrap_count',
    description: 'Tag telemetrii z narastającym licznikiem odrzutu.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  scrapTag?: string;

  @ApiPropertyOptional({
    example: 'UNCLASSIFIED',
    description: 'Kategoria nadawana odrzutowi wykrytemu z telemetrii.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  scrapDefaultCategory?: string;
}

export class BulkUpdateMachineConfigDto extends UpdateMachineConfigDto {
  @ApiProperty({
    type: [String],
    description: 'Maszyny, na które kopiujemy ustawienia.',
  })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  machineIds: string[];

  @ApiPropertyOptional({
    description:
      'true = zastosuj do wszystkich maszyn klienta, ignorując machineIds. Ratuje przed klikaniem stu pozycji.',
  })
  @IsOptional()
  @IsBoolean()
  allMachines?: boolean;
}
