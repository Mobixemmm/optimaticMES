import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IndustryPacksService } from './industry-packs.service';
import { RequirePermission } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';

@ApiTags('Pakiety branżowe')
@Controller('settings/industry-packs')
export class IndustryPacksController {
  constructor(private readonly industryPacksService: IndustryPacksService) {}

  @Get()
  @RequirePermission(PERMISSIONS.SETTINGS_READ)
  @ApiOperation({ summary: 'Dostępne pakiety startowe (fabryka, lotnisko, magazyn)' })
  list() {
    return this.industryPacksService.list();
  }

  @Post(':code/apply')
  @RequirePermission(PERMISSIONS.SETTINGS_WRITE)
  @ApiOperation({
    summary: 'Nałóż pakiet na bieżącego klienta (nadpisuje tylko to, co opisuje)',
  })
  apply(@Param('code') code: string) {
    return this.industryPacksService.apply(code);
  }
}
