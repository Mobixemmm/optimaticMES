import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MachineConfigsService } from './machine-configs.service';
import {
  BulkUpdateMachineConfigDto,
  UpdateMachineConfigDto,
} from './dto/update-machine-config.dto';
import { RequirePermission } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';

@ApiTags('Konfiguracja maszyn (panel operatorski)')
@Controller('machine-configs')
export class MachineConfigsController {
  constructor(private readonly machineConfigsService: MachineConfigsService) {}

  @Get('panel-modules')
  // Sam katalog kafelków czyta każdy, kto może otworzyć panel — bez tego panel
  // nie wie, jak nazwać to, co ma narysować.
  @RequirePermission(PERMISSIONS.PANEL_READ)
  @ApiOperation({ summary: 'Katalog kafelków HMI wraz ze stanem modułu nadrzędnego' })
  listPanelModules() {
    return this.machineConfigsService.listPanelModules();
  }

  @Get()
  @RequirePermission(PERMISSIONS.PANEL_READ)
  @ApiOperation({ summary: 'Konfiguracja panelu dla wszystkich maszyn' })
  listAll() {
    return this.machineConfigsService.listAll();
  }

  @Get(':machineId')
  @RequirePermission(PERMISSIONS.PANEL_READ)
  @ApiOperation({ summary: 'Konfiguracja panelu jednej maszyny (po scaleniu z domyślnymi)' })
  getOne(@Param('machineId') machineId: string) {
    return this.machineConfigsService.getForMachine(machineId);
  }

  @Put(':machineId')
  @RequirePermission(PERMISSIONS.PANEL_CONFIGURE)
  @ApiOperation({ summary: 'Ustaw kafelki HMI i źródło odrzutu dla maszyny' })
  update(
    @Param('machineId') machineId: string,
    @Body() dto: UpdateMachineConfigDto,
  ) {
    return this.machineConfigsService.update(machineId, dto);
  }

  @Post('bulk')
  @RequirePermission(PERMISSIONS.PANEL_CONFIGURE)
  @ApiOperation({
    summary: 'Skopiuj te same ustawienia na wiele maszyn (albo na wszystkie)',
  })
  async bulkUpdate(@Body() dto: BulkUpdateMachineConfigDto) {
    const updated = await this.machineConfigsService.bulkUpdate(dto);
    return { updated };
  }
}
