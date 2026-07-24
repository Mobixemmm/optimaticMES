import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ProductionOrder } from '../entities/production-order.entity';

@ApiTags('Zlecenia produkcyjne')
@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    @Get()
    @ApiOperation({ summary: 'Pobierz wszystkie zlecenia' })
    async findAll(): Promise<ProductionOrder[]> {
        return this.ordersService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Pobierz zlecenie po ID' })
    async findOne(@Param('id', ParseIntPipe) id: number): Promise<ProductionOrder> {
        return this.ordersService.findOne(id);
    }

    @Post()
    @ApiOperation({ summary: 'Stwórz nowe zlecenie' })
    async create(@Body() data: CreateOrderDto): Promise<ProductionOrder> {
        return this.ordersService.create(data);
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Zmień status zlecenia' })
    async updateStatus(
        @Param('id', ParseIntPipe) id: number,
        @Body('status') status: string,
    ): Promise<ProductionOrder> {
        return this.ordersService.updateStatus(id, status);
    }
}