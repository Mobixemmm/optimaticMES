import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginRfidDto {
  @ApiProperty({ description: 'Numer karty RFID', example: 'A3F29B1C4D5E' })
  @IsString()
  rfidCardId: string;

  @ApiProperty({
    description: 'PIN operatora (4-8 cyfr) — drugi składnik logowania',
    example: '1234',
  })
  @Matches(/^\d{4,8}$/, { message: 'PIN musi mieć 4-8 cyfr' })
  pin: string;
}
