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
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderProgressDto } from './dto/update-order-progress.dto';
import { ProductionOrder } from '../entities/production-order.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResult } from '../common/dto/paginated-result';
import { RequirePermission } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';

@ApiTags('Zlecenia produkcyjne')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ORDERS_READ)
  @ApiOperation({ summary: 'Pobierz zlecenia (stronicowane)' })
  async findAll(
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResult<ProductionOrder>> {
    return this.ordersService.findAll(pagination);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.ORDERS_READ)
  @ApiOperation({ summary: 'Pobierz zlecenie po ID' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProductionOrder> {
    return this.ordersService.findOne(id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.ORDERS_CREATE)
  @ApiOperation({ summary: 'Stwórz nowe zlecenie' })
  async create(@Body() data: CreateOrderDto): Promise<ProductionOrder> {
    return this.ordersService.create(data);
  }

  @Patch(':id/status')
  @RequirePermission(PERMISSIONS.ORDERS_UPDATE)
  @ApiOperation({ summary: 'Zmień status zlecenia' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<ProductionOrder> {
    return this.ordersService.updateStatus(id, dto.status);
  }

  @Patch(':id/progress')
  @RequirePermission(PERMISSIONS.ORDERS_UPDATE)
  @ApiOperation({ summary: 'Zaktualizuj postęp produkcji (wykonane/braki)' })
  async updateProgress(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderProgressDto,
  ): Promise<ProductionOrder> {
    return this.ordersService.updateProgress(id, dto);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.ORDERS_DELETE)
  @ApiOperation({ summary: 'Usuń zlecenie' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.ordersService.delete(id);
  }
}
