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
import { AndonService } from './andon.service';
import { CreateAndonAlertDto } from './dto/create-andon-alert.dto';
import { FindAndonQueryDto } from './dto/find-andon-query.dto';
import { AndonAlert } from '../entities/andon-alert.entity';
import { PaginatedResult } from '../common/dto/paginated-result';
import { RequirePermission } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';

@ApiTags('Andon')
@Controller('andon')
export class AndonController {
  constructor(private readonly andonService: AndonService) {}

  @Get()
  @RequirePermission(PERMISSIONS.ANDON_READ)
  @ApiOperation({ summary: 'Pobierz alerty Andon (stronicowane, opcjonalnie ?resolved=true/false)' })
  async findAll(
    @Query() query: FindAndonQueryDto,
  ): Promise<PaginatedResult<AndonAlert>> {
    return this.andonService.findAll(query);
  }

  @Post()
  @RequirePermission(PERMISSIONS.ANDON_REPORT)
  @ApiOperation({ summary: 'Zgłoś alert Andon' })
  async create(@Body() dto: CreateAndonAlertDto): Promise<AndonAlert> {
    return this.andonService.create(dto);
  }

  @Patch(':id/resolve')
  @RequirePermission(PERMISSIONS.ANDON_RESOLVE)
  @ApiOperation({ summary: 'Oznacz alert jako rozwiązany' })
  async resolve(@Param('id', ParseIntPipe) id: number): Promise<AndonAlert> {
    return this.andonService.resolve(id);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.ANDON_DELETE)
  @ApiOperation({ summary: 'Usuń alert Andon' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ success: boolean }> {
    await this.andonService.remove(id);
    return { success: true };
  }
}
