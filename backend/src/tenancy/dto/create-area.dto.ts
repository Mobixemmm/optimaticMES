import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAreaDto {
  @ApiProperty()
  @IsInt()
  siteId: number;

  @ApiPropertyOptional({ description: 'Obszar nadrzędny — pozwala zagnieżdżać' })
  @IsOptional()
  @IsInt()
  parentAreaId?: number | null;

  @ApiProperty({ example: 'linia-1' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z0-9][a-z0-9-_]*$/, {
    message: 'Kod obszaru: małe litery, cyfry, myślnik lub podkreślenie',
  })
  code: string;

  @ApiProperty({ example: 'Linia 1' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;
}
