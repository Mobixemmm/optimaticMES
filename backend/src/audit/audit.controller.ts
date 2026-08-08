import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditLog } from '../entities/audit-log.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResult } from '../common/dto/paginated-result';
import { RequirePermission } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';

@ApiTags('Dziennik audytu')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission(PERMISSIONS.AUDIT_READ)
  @ApiOperation({ summary: 'Historia zmian (kto/kiedy/co) — admin' })
  async findAll(
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResult<AuditLog>> {
    return this.auditService.findAll(pagination);
  }
}
