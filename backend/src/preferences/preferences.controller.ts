import { Body, Controller, Delete, Get, Put } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PreferencesService } from './preferences.service';
import { UpdateChartColorsDto } from './dto/update-chart-colors.dto';

// Świadomie bez @RequirePermission: to są ustawienia własnego konta, a nie
// konfiguracja klienta. Każdy zalogowany może zmieniać wyłącznie swoje —
// użytkownika bierzemy z kontekstu żądania, nie z parametru ścieżki, więc nie ma
// czym podstawić cudzego id.
@ApiTags('Preferencje użytkownika')
@Controller('me/preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Preferencje UI zalogowanego użytkownika' })
  getAll() {
    return this.preferencesService.getAll();
  }

  @Put('chart-colors')
  @ApiOperation({
    summary:
      'Zapisz kolory legendy wykresów analityki (upsert przy koncie użytkownika)',
  })
  setChartColors(@Body() dto: UpdateChartColorsDto) {
    return this.preferencesService.setChartColors(dto.colors);
  }

  @Delete('chart-colors')
  @ApiOperation({ summary: 'Przywróć domyślne kolory legendy' })
  resetChartColors() {
    return this.preferencesService.resetChartColors();
  }
}
