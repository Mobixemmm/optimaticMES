import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { PlanningService } from './planning.service';
import { AssignOrderDto, ReorderQueueDto } from './dto/assign-order.dto';
import { RequirePermission } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';

@ApiTags('Planowanie')
@Controller('planning')
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Get('board')
  @RequirePermission(PERMISSIONS.PLANNING_READ)
  @ApiOperation({ summary: 'Tablica planowania: kolejki maszyn i obciążenie' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async board(@Query('days') days?: string) {
    return this.planningService.board(days ? Number(days) : 7);
  }

  @Patch('orders/:id/assign')
  @RequirePermission(PERMISSIONS.PLANNING_WRITE)
  @ApiOperation({ summary: 'Przypisz zlecenie do maszyny (null zdejmuje z planu)' })
  async assign(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignOrderDto) {
    return this.planningService.assign(id, dto);
  }

  @Post('reorder')
  @RequirePermission(PERMISSIONS.PLANNING_WRITE)
  @ApiOperation({ summary: 'Ustaw kolejność zleceń w kolejce maszyny' })
  async reorder(@Body() dto: ReorderQueueDto) {
    return this.planningService.reorder(dto);
  }
}
