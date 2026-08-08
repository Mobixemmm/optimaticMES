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
import { QualityService } from './quality.service';
import { CreateQualityDefectDto } from './dto/create-quality-defect.dto';
import { ResolveQualityDefectDto } from './dto/resolve-quality-defect.dto';
import { QualityDefect } from '../entities/quality-defect.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResult } from '../common/dto/paginated-result';
import { RequirePermission } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';

@ApiTags('Jakość')
@Controller('quality')
export class QualityController {
  constructor(private readonly qualityService: QualityService) {}

  @Get('defects')
  @RequirePermission(PERMISSIONS.QUALITY_READ)
  @ApiOperation({ summary: 'Pobierz karty wad (stronicowane)' })
  @ApiQuery({ name: 'orderId', required: false, type: Number })
  async findAll(
    @Query() pagination: PaginationQueryDto,
    @Query('orderId') orderId?: string,
  ): Promise<PaginatedResult<QualityDefect>> {
    return this.qualityService.findAll(
      pagination,
      orderId ? Number(orderId) : undefined,
    );
  }

  @Get('pareto')
  @RequirePermission(PERMISSIONS.QUALITY_READ)
  @ApiOperation({ summary: 'Pareto przyczyn wad wraz z podsumowaniem braków' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  async pareto(@Query('days') days?: string) {
    return this.qualityService.pareto(days ? Number(days) : 30);
  }

  @Get('defects/:id')
  @RequirePermission(PERMISSIONS.QUALITY_READ)
  @ApiOperation({ summary: 'Pobierz kartę wady po ID' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<QualityDefect> {
    return this.qualityService.findOne(id);
  }

  @Post('defects')
  @RequirePermission(PERMISSIONS.QUALITY_WRITE)
  @ApiOperation({ summary: 'Zarejestruj wadę (brak lub sztukę do poprawki)' })
  async create(@Body() dto: CreateQualityDefectDto): Promise<QualityDefect> {
    return this.qualityService.create(dto);
  }

  @Patch('defects/:id/resolve')
  @RequirePermission(PERMISSIONS.QUALITY_WRITE)
  @ApiOperation({ summary: 'Rozstrzygnij poprawkę: uratowana albo na złom' })
  async resolve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolveQualityDefectDto,
  ): Promise<QualityDefect> {
    return this.qualityService.resolve(id, dto);
  }

  @Delete('defects/:id')
  @RequirePermission(PERMISSIONS.QUALITY_DELETE)
  @ApiOperation({ summary: 'Usuń kartę wady' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ success: boolean }> {
    await this.qualityService.remove(id);
    return { success: true };
  }
}
