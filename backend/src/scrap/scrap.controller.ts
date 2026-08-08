import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ScrapService } from './scrap.service';
import {
  CreateScrapCategoryDto,
  UpdateScrapCategoryDto,
} from './dto/scrap-category.dto';
import { ReclassifyScrapDto, ReportScrapDto } from './dto/report-scrap.dto';
import { RequirePermission } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';

@ApiTags('Odrzut (SCRAP)')
@Controller('scrap')
export class ScrapController {
  constructor(private readonly scrapService: ScrapService) {}

  @Get('categories')
  @RequirePermission(PERMISSIONS.SCRAP_READ)
  @ApiOperation({ summary: 'Katalog przyczyn odrzutu' })
  listCategories(@Query('includeInactive') includeInactive?: string) {
    return this.scrapService.listCategories(includeInactive === 'true');
  }

  @Post('categories')
  @RequirePermission(PERMISSIONS.SCRAP_CATEGORIES_WRITE)
  @ApiOperation({ summary: 'Dodaj przyczynę odrzutu' })
  createCategory(@Body() dto: CreateScrapCategoryDto) {
    return this.scrapService.createCategory(dto);
  }

  @Patch('categories/:id')
  @RequirePermission(PERMISSIONS.SCRAP_CATEGORIES_WRITE)
  @ApiOperation({ summary: 'Zmień lub wycofaj przyczynę odrzutu' })
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateScrapCategoryDto,
  ) {
    return this.scrapService.updateCategory(id, dto);
  }

  @Get('events')
  @RequirePermission(PERMISSIONS.SCRAP_READ)
  @ApiOperation({ summary: 'Zgłoszenia odrzutu' })
  async list(@Query('days') days?: string, @Query('machineId') machineId?: string) {
    // Import z telemetrii jest idempotentny i tani, więc odpalamy go przy
    // odczycie — dzięki temu licznik z maszyny widać bez zewnętrznego crona.
    await this.scrapService.ingestFromTelemetry();
    const parsed = days ? Number.parseInt(days, 10) : 30;
    return this.scrapService.list(
      Number.isNaN(parsed) ? 30 : parsed,
      machineId,
    );
  }

  @Get('summary')
  @RequirePermission(PERMISSIONS.SCRAP_READ)
  @ApiOperation({ summary: 'Odrzut w rozbiciu na przyczyny, maszyny i źródło' })
  async summary(@Query('days') days?: string) {
    await this.scrapService.ingestFromTelemetry();
    const parsed = days ? Number.parseInt(days, 10) : 30;
    return this.scrapService.summary(Number.isNaN(parsed) ? 30 : parsed);
  }

  @Post('report')
  @RequirePermission(PERMISSIONS.SCRAP_REPORT)
  @ApiOperation({ summary: 'Zgłoś odrzut z przycisku operatora' })
  report(@Body() dto: ReportScrapDto) {
    return this.scrapService.report(dto);
  }

  @Post('ingest')
  @RequirePermission(PERMISSIONS.SCRAP_REPORT)
  @ApiOperation({
    summary: 'Wymuś import odrzutu z logów telemetrii (dla crona lub przycisku w UI)',
  })
  ingest() {
    return this.scrapService.ingestFromTelemetry();
  }

  @Patch('events/:id/category')
  @RequirePermission(PERMISSIONS.SCRAP_REPORT)
  @ApiOperation({ summary: 'Nadaj przyczynę odrzutowi wykrytemu przez czujnik' })
  reclassify(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReclassifyScrapDto,
  ) {
    return this.scrapService.reclassify(id, dto);
  }

  @Delete('events/:id')
  @RequirePermission(PERMISSIONS.SCRAP_DELETE)
  @ApiOperation({ summary: 'Usuń błędne zgłoszenie odrzutu' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.scrapService.remove(id);
    return { deleted: true };
  }
}
