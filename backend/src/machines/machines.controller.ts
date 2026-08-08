import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MachinesService } from './machines.service';
import { CreateMachineDto } from './dto/create-machine.dto';
import { UpdateMachineDto } from './dto/update-machine.dto';
import { Machine } from '../entities/machine.entity';
import { RequirePermission } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';

@ApiTags('Kartoteka maszyn')
@Controller('machines')
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Get()
  @RequirePermission(PERMISSIONS.MACHINES_READ)
  @ApiOperation({ summary: 'Lista maszyn' })
  async findAll(): Promise<Machine[]> {
    return this.machinesService.findAll();
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.MACHINES_READ)
  @ApiOperation({ summary: 'Pobierz maszynę po ID' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Machine> {
    return this.machinesService.findOne(id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.MACHINES_WRITE)
  @ApiOperation({ summary: 'Dodaj maszynę do kartoteki (admin)' })
  async create(@Body() dto: CreateMachineDto): Promise<Machine> {
    return this.machinesService.create(dto);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.MACHINES_WRITE)
  @ApiOperation({ summary: 'Edytuj maszynę (admin)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMachineDto,
  ): Promise<Machine> {
    return this.machinesService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.MACHINES_WRITE)
  @ApiOperation({ summary: 'Usuń maszynę z kartoteki (admin)' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ success: boolean }> {
    await this.machinesService.remove(id);
    return { success: true };
  }
}
