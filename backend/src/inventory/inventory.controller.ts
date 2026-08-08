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
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { InventoryItem } from '../entities/inventory-item.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResult } from '../common/dto/paginated-result';
import { RequirePermission } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';

@ApiTags('Magazyn')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @RequirePermission(PERMISSIONS.INVENTORY_READ)
  @ApiOperation({ summary: 'Pobierz pozycje magazynowe (stronicowane)' })
  async findAll(
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResult<InventoryItem>> {
    return this.inventoryService.findAll(pagination);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.INVENTORY_READ)
  @ApiOperation({ summary: 'Pobierz pozycję magazynową po ID' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<InventoryItem> {
    return this.inventoryService.findOne(id);
  }

  @Post()
  @RequirePermission(PERMISSIONS.INVENTORY_WRITE)
  @ApiOperation({ summary: 'Dodaj pozycję magazynową' })
  async create(@Body() dto: CreateInventoryItemDto): Promise<InventoryItem> {
    return this.inventoryService.create(dto);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.INVENTORY_WRITE)
  @ApiOperation({ summary: 'Edytuj pozycję magazynową' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInventoryItemDto,
  ): Promise<InventoryItem> {
    return this.inventoryService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.INVENTORY_DELETE)
  @ApiOperation({ summary: 'Usuń pozycję magazynową' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ success: boolean }> {
    await this.inventoryService.remove(id);
    return { success: true };
  }
}
