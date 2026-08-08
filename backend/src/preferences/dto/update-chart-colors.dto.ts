import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateChartColorsDto {
  // Mapa o dynamicznych kluczach, więc class-validator sprawdza tylko, że to
  // w ogóle obiekt — nazwy slotów i format wartości weryfikuje
  // PreferencesService, tak samo jak ModulesService weryfikuje klucze modułów.
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { failure: '#eb6834', setup: '#1baf7a' },
    description:
      'Przyczyna przestoju → kolor #rrggbb. Pominięty slot zostaje przy domyślnym kolorze motywu.',
  })
  @IsObject()
  colors: Record<string, string>;
}
