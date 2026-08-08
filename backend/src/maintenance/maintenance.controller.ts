import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceTaskDto } from './dto/create-maintenance-task.dto';
import { UpdateMaintenanceTaskDto } from './dto/update-maintenance-task.dto';
import { MaintenanceTask } from '../entities/maintenance-task.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResult } from '../common/dto/paginated-result';
import { RequirePermission } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';

@ApiTags('Utrzymanie ruchu')
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  @RequirePermission(PERMISSIONS.MAINTENANCE_READ)
  @ApiOperation({ summary: 'Pobierz zgłoszenia serwisowe (stronicowane)' })
  async findAll(
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResult<MaintenanceTask>> {
    return this.maintenanceService.findAll(pagination);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.MAINTENANCE_READ)
  @ApiOperation({ summary: 'Pobierz zgłoszenie serwisowe po ID' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<MaintenanceTask> {
    return this.maintenanceService.findOne(id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.MAINTENANCE_WRITE)
  @ApiOperation({ summary: 'Dodaj zgłoszenie serwisowe' })
  async create(@Body() dto: CreateMaintenanceTaskDto): Promise<MaintenanceTask> {
    return this.maintenanceService.create(dto);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.MAINTENANCE_WRITE)
  @ApiOperation({ summary: 'Edytuj zgłoszenie serwisowe (np. status)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMaintenanceTaskDto,
  ): Promise<MaintenanceTask> {
    return this.maintenanceService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.MAINTENANCE_DELETE)
  @ApiOperation({ summary: 'Usuń zgłoszenie serwisowe' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ success: boolean }> {
    await this.maintenanceService.remove(id);
    return { success: true };
  }
}
