import { Controller, Get, Put, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ModulesService } from './modules.service';
import { UpdateModulesDto } from './dto/update-modules.dto';
import { RequirePermission } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';

@ApiTags('Konfiguracja modułów')
@Controller('settings/modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.SETTINGS_READ)
  @ApiOperation({
    summary: 'Pełna konfiguracja modułów (także wyłączonych) — dla panelu admina',
  })
  list(@Query('siteId') siteId?: string) {
    return this.modulesService.listEffective(
      siteId === undefined ? undefined : Number.parseInt(siteId, 10),
    );
  }

  @Put()
  @RequirePermission(PERMISSIONS.SETTINGS_WRITE)
  @ApiOperation({ summary: 'Zmień moduły: włącz/wyłącz, nazwa, ikona, kolejność, ustawienia' })
  update(@Body() dto: UpdateModulesDto) {
    return this.modulesService.updateMany(dto);
  }
}
