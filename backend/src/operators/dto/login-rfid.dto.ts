import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginRfidDto {
    @ApiProperty({ description: 'Numer karty RFID', example: 'A3F29B1C4D5E' })
    @IsString()
    rfidCardId: string;
}