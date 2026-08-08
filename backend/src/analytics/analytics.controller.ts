import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsDatasetService } from './analytics-dataset.service';
import { RequirePermission } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';

@ApiTags('Analityka')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly datasetService: AnalyticsDatasetService,
  ) {}

  @Get('summary')
  @RequirePermission(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({ summary: 'Zbiorcze wskaźniki produkcyjne (OEE, MTTR/MTBF, Andon...)' })
  async getSummary(@Query('days') days?: string) {
    const parsed = days ? parseInt(days, 10) : undefined;
    return this.analyticsService.getSummary(parsed && !Number.isNaN(parsed) ? parsed : 30);
  }

  @Get('dataset')
  @RequirePermission(PERMISSIONS.ANALYTICS_READ)
  @ApiOperation({
    summary:
      'Surowe zdarzenia do pulpitu analitycznego — przekroje liczy przeglądarka, żeby filtrowanie krzyżowe działało bez odpytywania serwera',
  })
  async getDataset(@Query('days') days?: string) {
    const parsed = days ? parseInt(days, 10) : undefined;
    return this.datasetService.getDataset(
      parsed && !Number.isNaN(parsed) ? parsed : 30,
    );
  }
}
