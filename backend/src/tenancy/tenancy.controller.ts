import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TenancyService } from './tenancy.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { RequirePermission } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';

@ApiTags('Struktura organizacyjna')
@Controller('tenancy')
export class TenancyController {
  constructor(private readonly tenancyService: TenancyService) {}

  @Get('tenant')
  @RequirePermission(PERMISSIONS.TENANCY_READ)
  @ApiOperation({ summary: 'Dane klienta wraz z terminologią' })
  getTenant() {
    return this.tenancyService.getTenant();
  }

  @Patch('tenant')
  @RequirePermission(PERMISSIONS.TENANCY_WRITE)
  @ApiOperation({ summary: 'Zmień nazwę klienta lub nazewnictwo modułów' })
  updateTenant(@Body() dto: UpdateTenantDto) {
    return this.tenancyService.updateTenant(dto);
  }

  @Get('sites')
  @RequirePermission(PERMISSIONS.TENANCY_READ)
  @ApiOperation({ summary: 'Lista zakładów' })
  listSites() {
    return this.tenancyService.listSites();
  }

  @Post('sites')
  @RequirePermission(PERMISSIONS.TENANCY_WRITE)
  @ApiOperation({ summary: 'Dodaj zakład' })
  createSite(@Body() dto: CreateSiteDto) {
    return this.tenancyService.createSite(dto);
  }

  @Patch('sites/:id')
  @RequirePermission(PERMISSIONS.TENANCY_WRITE)
  @ApiOperation({ summary: 'Zmień zakład' })
  updateSite(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSiteDto) {
    return this.tenancyService.updateSite(id, dto);
  }

  @Delete('sites/:id')
  @RequirePermission(PERMISSIONS.TENANCY_WRITE)
  @ApiOperation({ summary: 'Usuń zakład (musi być pusty)' })
  async removeSite(@Param('id', ParseIntPipe) id: number) {
    await this.tenancyService.removeSite(id);
    return { success: true };
  }

  @Get('areas')
  @RequirePermission(PERMISSIONS.TENANCY_READ)
  @ApiOperation({ summary: 'Lista obszarów, opcjonalnie w jednym zakładzie' })
  listAreas(@Query('siteId') siteId?: string) {
    return this.tenancyService.listAreas(
      siteId === undefined ? undefined : Number.parseInt(siteId, 10),
    );
  }

  @Post('areas')
  @RequirePermission(PERMISSIONS.TENANCY_WRITE)
  @ApiOperation({ summary: 'Dodaj obszar' })
  createArea(@Body() dto: CreateAreaDto) {
    return this.tenancyService.createArea(dto);
  }

  @Patch('areas/:id')
  @RequirePermission(PERMISSIONS.TENANCY_WRITE)
  @ApiOperation({ summary: 'Zmień obszar' })
  updateArea(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAreaDto) {
    return this.tenancyService.updateArea(id, dto);
  }

  @Delete('areas/:id')
  @RequirePermission(PERMISSIONS.TENANCY_WRITE)
  @ApiOperation({ summary: 'Usuń obszar (bez podobszarów)' })
  async removeArea(@Param('id', ParseIntPipe) id: number) {
    await this.tenancyService.removeArea(id);
    return { success: true };
  }
}
