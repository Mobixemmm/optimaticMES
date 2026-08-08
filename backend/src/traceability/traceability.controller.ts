import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TraceabilityService } from './traceability.service';
import { RequirePermission } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';

@ApiTags('Genealogia (traceability)')
@Controller('traceability')
export class TraceabilityController {
  constructor(private readonly traceabilityService: TraceabilityService) {}

  @Get('batches')
  @RequirePermission(PERMISSIONS.TRACEABILITY_READ)
  @ApiOperation({ summary: 'Numery partii obecne w wydaniach materiału' })
  async listBatches() {
    return this.traceabilityService.listBatches();
  }

  @Get('orders/:orderId')
  @RequirePermission(PERMISSIONS.TRACEABILITY_READ)
  @ApiOperation({ summary: 'Paszport wyrobu: materiały, partie, wady i obsada zlecenia' })
  async traceOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.traceabilityService.traceOrder(orderId);
  }

  @Get('batches/:batchNumber')
  @RequirePermission(PERMISSIONS.TRACEABILITY_READ)
  @ApiOperation({ summary: 'Ścieżka wycofania: zlecenia, do których trafiła partia' })
  async traceBatch(@Param('batchNumber') batchNumber: string) {
    return this.traceabilityService.traceBatch(batchNumber);
  }
}
