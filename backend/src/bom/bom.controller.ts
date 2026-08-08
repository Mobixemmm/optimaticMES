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
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BomService } from './bom.service';
import { CreateBomItemDto } from './dto/create-bom-item.dto';
import { UpdateBomItemDto } from './dto/update-bom-item.dto';
import { ConsumeMaterialDto } from './dto/consume-material.dto';
import { RequirePermission } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';

@ApiTags('BOM i materiały')
@Controller('bom')
export class BomController {
  constructor(private readonly bomService: BomService) {}

  @Get('products')
  @RequirePermission(PERMISSIONS.BOM_READ)
  @ApiOperation({ summary: 'Produkty, które mają zdefiniowaną recepturę' })
  async listProducts() {
    return this.bomService.listProducts();
  }

  @Get('items')
  @RequirePermission(PERMISSIONS.BOM_READ)
  @ApiOperation({ summary: 'Receptura wskazanego produktu' })
  @ApiQuery({ name: 'productName', required: true })
  async findByProduct(@Query('productName') productName: string) {
    return this.bomService.findByProduct(productName);
  }

  @Post('items')
  @RequirePermission(PERMISSIONS.BOM_WRITE)
  @ApiOperation({ summary: 'Dodaj materiał do receptury produktu' })
  async create(@Body() dto: CreateBomItemDto) {
    return this.bomService.create(dto);
  }

  @Patch('items/:id')
  @RequirePermission(PERMISSIONS.BOM_WRITE)
  @ApiOperation({ summary: 'Zmień normę zużycia pozycji receptury' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBomItemDto,
  ) {
    return this.bomService.update(id, dto);
  }

  @Delete('items/:id')
  @RequirePermission(PERMISSIONS.BOM_DELETE)
  @ApiOperation({ summary: 'Usuń pozycję receptury' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ success: boolean }> {
    await this.bomService.remove(id);
    return { success: true };
  }

  @Get('orders/:orderId/requirements')
  @RequirePermission(PERMISSIONS.BOM_READ)
  @ApiOperation({ summary: 'Zapotrzebowanie zlecenia: plan wg receptury kontra faktyczne wydania' })
  async requirements(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.bomService.requirementsForOrder(orderId);
  }

  @Get('orders/:orderId/consumptions')
  @RequirePermission(PERMISSIONS.BOM_READ)
  @ApiOperation({ summary: 'Materiały wydane na zlecenie (z numerami partii)' })
  async consumptions(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.bomService.consumptionsForOrder(orderId);
  }

  @Post('consumptions')
  @RequirePermission(PERMISSIONS.BOM_WRITE)
  @ApiOperation({ summary: 'Wydaj materiał na zlecenie (zdejmuje ze stanu magazynu)' })
  async consume(@Body() dto: ConsumeMaterialDto) {
    return this.bomService.consume(dto);
  }

  @Delete('consumptions/:id')
  @RequirePermission(PERMISSIONS.BOM_DELETE)
  @ApiOperation({ summary: 'Cofnij wydanie materiału (zwraca na stan)' })
  async removeConsumption(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ success: boolean }> {
    await this.bomService.removeConsumption(id);
    return { success: true };
  }
}
