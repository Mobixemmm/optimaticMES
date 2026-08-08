import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { tenantScope } from '../common/request-context';
import { AuditLog } from '../entities/audit-log.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResult, paginatedResult } from '../common/dto/paginated-result';

export interface RecordAuditEntry {
  // Podawany jawnie przez AuditInterceptor, a nie odczytywany z kontekstu:
  // zapis leci "fire-and-forget", więc nie zakładamy, że kontekst żądania
  // wciąż żyje w chwili faktycznego INSERT-a.
  tenantId: number;
  userId: number | null;
  userEmail: string | null;
  method: string;
  path: string;
  statusCode: number;
  body: Record<string, unknown> | null;
  ip: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  // Wołane "fire-and-forget" z AuditInterceptor — błąd zapisu audytu nie może
  // nigdy zablokować ani cofnąć rzeczywistej operacji użytkownika.
  async record(entry: RecordAuditEntry): Promise<void> {
    try {
      await this.auditRepository.save(this.auditRepository.create(entry));
    } catch (err) {
      this.logger.warn(`Nie udało się zapisać wpisu audytu: ${(err as Error).message}`);
    }
  }

  async findAll(
    pagination: PaginationQueryDto = {},
  ): Promise<PaginatedResult<AuditLog>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 50;
    const [data, total] = await this.auditRepository.findAndCount({
      where: tenantScope(),
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginatedResult(data, total, page, limit);
  }
}
