import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MachineDataService } from './machine-data.service';
import { RequirePermission } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';

@ApiTags('Dane z maszyn (lotnisko)')
@Controller('machine-data')
export class MachineDataController {
  constructor(private readonly machineDataService: MachineDataService) {}

  @Get()
  @RequirePermission(PERMISSIONS.MACHINES_READ)
  @ApiOperation({ summary: 'Ostatnie odczyty z maszyn' })
  async findLatest(
    @Query('machineId') machineId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.machineDataService.findLatest(machineId, limit);
  }

  @Get('machines')
  @RequirePermission(PERMISSIONS.MACHINES_READ)
  @ApiOperation({ summary: 'Lista maszyn' })
  async getMachines() {
    return this.machineDataService.getMachines();
  }

  @Get(':machineId/tags')
  @RequirePermission(PERMISSIONS.MACHINES_READ)
  @ApiOperation({ summary: 'Lista tagów dla maszyny' })
  async getTags(@Param('machineId') machineId: string) {
    return this.machineDataService.getTags(machineId);
  }

  @Get(':machineId/latest')
  @RequirePermission(PERMISSIONS.MACHINES_READ)
  @ApiOperation({ summary: 'Ostatnie wartości wszystkich tagów' })
  async getLatestValues(@Param('machineId') machineId: string) {
    return this.machineDataService.getLatestValues(machineId);
  }

  @Get(':machineId/:tagName')
  @RequirePermission(PERMISSIONS.MACHINES_READ)
  @ApiOperation({ summary: 'Historia konkretnego tagu' })
  async findByTag(
    @Param('machineId') machineId: string,
    @Param('tagName') tagName: string,
    @Query('limit') limit?: number,
  ) {
    return this.machineDataService.findByTag(machineId, tagName, limit);
  }
}
