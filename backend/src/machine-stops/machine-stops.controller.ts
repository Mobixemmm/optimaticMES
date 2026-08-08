import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MachineStopsService } from './machine-stops.service';
import { StartMachineStopDto } from './dto/start-machine-stop.dto';
import { MachineStopEvent } from '../entities/machine-stop-event.entity';
import { RequirePermission } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';

@ApiTags('Przestoje maszyn')
@Controller('machine-stops')
export class MachineStopsController {
  constructor(private readonly machineStopsService: MachineStopsService) {}

  // Uwaga na kontrakt: `null` z handlera Nest odsyła jako PUSTE ciało z 200
  // (ExpressAdapter.reply → response.send() dla wartości nil), a nie jako JSON
  // "null". Klient nie może więc bezwarunkowo wołać res.json() — patrz
  // apiFetch w frontend/src/lib/api.ts, gdzie pusta odpowiedź mapuje się na null.
  @Get(':machine/current')
  @RequirePermission(PERMISSIONS.MACHINES_READ)
  @ApiOperation({ summary: 'Aktywny (otwarty) przestój maszyny, jeśli trwa' })
  async getCurrent(
    @Param('machine') machine: string,
  ): Promise<MachineStopEvent | null> {
    return this.machineStopsService.findCurrent(machine);
  }

  @Post(':machine/start')
  @RequirePermission(PERMISSIONS.MACHINES_CONTROL)
  @ApiOperation({ summary: 'Zgłoś rozpoczęcie przestoju maszyny' })
  async start(
    @Param('machine') machine: string,
    @Body() dto: StartMachineStopDto,
  ): Promise<MachineStopEvent> {
    return this.machineStopsService.start(machine, dto);
  }

  @Post(':machine/end')
  @RequirePermission(PERMISSIONS.MACHINES_CONTROL)
  @ApiOperation({ summary: 'Zakończ aktywny przestój (maszyna wraca do pracy)' })
  async end(
    @Param('machine') machine: string,
  ): Promise<MachineStopEvent | null> {
    return this.machineStopsService.endActive(machine);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.MACHINES_WRITE)
  @ApiOperation({ summary: 'Usuń zdarzenie przestoju' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ success: boolean }> {
    await this.machineStopsService.remove(id);
    return { success: true };
  }
}
