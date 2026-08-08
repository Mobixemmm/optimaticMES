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
import { IntegrationsService } from './integrations.service';
import { CreateConnectionDto, UpdateConnectionDto } from './dto/upsert-connection.dto';
import { RequirePermission } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';

@ApiTags('Integracje')
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('connectors')
  @RequirePermission(PERMISSIONS.INTEGRATIONS_READ)
  @ApiOperation({ summary: 'Katalog systemów zewnętrznych dostępnych dla branży klienta' })
  async listConnectors() {
    return this.integrationsService.listConnectors();
  }

  @Get('connections')
  @RequirePermission(PERMISSIONS.INTEGRATIONS_READ)
  @ApiOperation({ summary: 'Skonfigurowane połączenia (bez wartości sekretów)' })
  async listConnections() {
    return this.integrationsService.listConnections();
  }

  @Post('connections')
  @RequirePermission(PERMISSIONS.INTEGRATIONS_WRITE)
  @ApiOperation({ summary: 'Dodaj połączenie z systemem zewnętrznym' })
  async create(@Body() dto: CreateConnectionDto) {
    return this.integrationsService.create(dto);
  }

  @Patch('connections/:id')
  @RequirePermission(PERMISSIONS.INTEGRATIONS_WRITE)
  @ApiOperation({ summary: 'Zmień konfigurację połączenia' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateConnectionDto) {
    return this.integrationsService.update(id, dto);
  }

  @Delete('connections/:id')
  @RequirePermission(PERMISSIONS.INTEGRATIONS_DELETE)
  @ApiOperation({ summary: 'Usuń połączenie' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ success: boolean }> {
    await this.integrationsService.remove(id);
    return { success: true };
  }

  @Post('connections/:id/test')
  @RequirePermission(PERMISSIONS.INTEGRATIONS_WRITE)
  @ApiOperation({ summary: 'Sprawdź połączenie z systemem zewnętrznym' })
  async test(@Param('id', ParseIntPipe) id: number) {
    return this.integrationsService.test(id);
  }

  @Post('connections/:id/sync-orders')
  @RequirePermission(PERMISSIONS.INTEGRATIONS_WRITE)
  @ApiOperation({ summary: 'Pobierz zlecenia z systemu zewnętrznego' })
  async syncOrders(@Param('id', ParseIntPipe) id: number) {
    return this.integrationsService.syncOrders(id);
  }

  @Get('connections/:id/logs')
  @RequirePermission(PERMISSIONS.INTEGRATIONS_READ)
  @ApiOperation({ summary: 'Dziennik synchronizacji połączenia' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async logs(@Param('id', ParseIntPipe) id: number, @Query('limit') limit?: string) {
    return this.integrationsService.logs(id, limit ? Number(limit) : 20);
  }
}
