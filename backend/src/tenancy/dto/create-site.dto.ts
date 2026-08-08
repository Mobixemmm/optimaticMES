import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSiteDto {
  @ApiProperty({ example: 'terminal-a' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[a-z0-9][a-z0-9-_]*$/, {
    message: 'Kod zakładu: małe litery, cyfry, myślnik lub podkreślenie',
  })
  code: string;

  @ApiProperty({ example: 'Terminal A' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Europe/Warsaw' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  timezone?: string;
}
