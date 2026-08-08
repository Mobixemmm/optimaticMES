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
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { Shift } from '../entities/shift.entity';
import { RequirePermission } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';

@ApiTags('Kalendarz zmian')
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get()
  @RequirePermission(PERMISSIONS.SHIFTS_READ)
  @ApiOperation({ summary: 'Lista zmian w tygodniowym harmonogramie' })
  async findAll(): Promise<Shift[]> {
    return this.shiftsService.findAll();
  }

  @Post()
  @RequirePermission(PERMISSIONS.SHIFTS_WRITE)
  @ApiOperation({ summary: 'Dodaj zmianę do harmonogramu (admin)' })
  async create(@Body() dto: CreateShiftDto): Promise<Shift> {
    return this.shiftsService.create(dto);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.SHIFTS_WRITE)
  @ApiOperation({ summary: 'Edytuj zmianę (admin)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShiftDto,
  ): Promise<Shift> {
    return this.shiftsService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.SHIFTS_WRITE)
  @ApiOperation({ summary: 'Usuń zmianę z harmonogramu (admin)' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ success: boolean }> {
    await this.shiftsService.remove(id);
    return { success: true };
  }
}
