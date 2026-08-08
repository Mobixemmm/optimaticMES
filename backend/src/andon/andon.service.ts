import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { tenantScope, currentTenantId } from '../common/request-context';
import { AndonAlert } from '../entities/andon-alert.entity';
import { CreateAndonAlertDto } from './dto/create-andon-alert.dto';
import { FindAndonQueryDto } from './dto/find-andon-query.dto';
import { PaginatedResult, paginatedResult } from '../common/dto/paginated-result';

@Injectable()
export class AndonService {
  constructor(
    @InjectRepository(AndonAlert)
    private andonRepository: Repository<AndonAlert>,
  ) {}

  async findAll(query: FindAndonQueryDto = {}): Promise<PaginatedResult<AndonAlert>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const [data, total] = await this.andonRepository.findAndCount({
      where:
        query.resolved === undefined
          ? tenantScope()
          : { isResolved: query.resolved, ...tenantScope() },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginatedResult(data, total, page, limit);
  }

  async create(dto: CreateAndonAlertDto): Promise<AndonAlert> {
    const alert = this.andonRepository.create({
      ...dto,
      tenantId: currentTenantId(),
    });
    return this.andonRepository.save(alert);
  }

  async resolve(id: number): Promise<AndonAlert> {
    const alert = await this.andonRepository.findOne({
      where: { id, ...tenantScope() },
    });
    if (!alert) {
      throw new NotFoundException(`Alert Andon o ID ${id} nie istnieje`);
    }
    alert.isResolved = true;
    alert.resolvedAt = new Date();
    return this.andonRepository.save(alert);
  }

  async remove(id: number): Promise<void> {
    const alert = await this.andonRepository.findOne({
      where: { id, ...tenantScope() },
    });
    if (!alert) {
      throw new NotFoundException(`Alert Andon o ID ${id} nie istnieje`);
    }
    await this.andonRepository.remove(alert);
  }
}
