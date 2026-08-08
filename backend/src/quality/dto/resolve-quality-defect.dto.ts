import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Zamknięcie karty w statusie 'open' (czyli poprawki). 'reworked' = sztuka
// uratowana i nie liczy się do braków; 'scrapped' = poprawka nie wyszła.
export type DefectOutcome = 'reworked' | 'scrapped';

const OUTCOMES: DefectOutcome[] = ['reworked', 'scrapped'];

export class ResolveQualityDefectDto {
  @ApiProperty({ enum: OUTCOMES })
  @IsEnum(OUTCOMES)
  outcome: DefectOutcome;
}
