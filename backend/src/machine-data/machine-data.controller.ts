import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MachineDataService } from './machine-data.service';

@ApiTags('Dane z maszyn (lotnisko)')
@Controller('machine-data')
export class MachineDataController {
    constructor(private readonly machineDataService: MachineDataService) {}

    @Get()
    @ApiOperation({ summary: 'Ostatnie odczyty z maszyn' })
    async findLatest(@Query('machineId') machineId?: string, @Query('limit') limit?: number) {
        return this.machineDataService.findLatest(machineId, limit);
    }

    @Get('machines')
    @ApiOperation({ summary: 'Lista maszyn' })
    async getMachines() {
        return this.machineDataService.getMachines();
    }

    @Get(':machineId/tags')
    @ApiOperation({ summary: 'Lista tagów dla maszyny' })
    async getTags(@Param('machineId') machineId: string) {
        return this.machineDataService.getTags(machineId);
    }

    @Get(':machineId/latest')
    @ApiOperation({ summary: 'Ostatnie wartości wszystkich tagów' })
    async getLatestValues(@Param('machineId') machineId: string) {
        return this.machineDataService.getLatestValues(machineId);
    }

    @Get(':machineId/:tagName')
    @ApiOperation({ summary: 'Historia konkretnego tagu' })
    async findByTag(
        @Param('machineId') machineId: string,
        @Param('tagName') tagName: string,
        @Query('limit') limit?: number,
    ) {
        return this.machineDataService.findByTag(machineId, tagName, limit);
    }
}