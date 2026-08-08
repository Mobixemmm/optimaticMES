import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { tenantScope, currentTenantId } from '../common/request-context';
import { InventoryItem } from '../entities/inventory-item.entity';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResult, paginatedResult } from '../common/dto/paginated-result';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(InventoryItem)
    private inventoryRepository: Repository<InventoryItem>,
  ) {}

  async findAll(
    pagination: PaginationQueryDto = {},
  ): Promise<PaginatedResult<InventoryItem>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 50;
    const [data, total] = await this.inventoryRepository.findAndCount({
      where: tenantScope(),
      order: { code: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginatedResult(data, total, page, limit);
  }

  async findOne(id: number): Promise<InventoryItem> {
    const item = await this.inventoryRepository.findOne({
      where: { id, ...tenantScope() },
    });
    if (!item) {
      throw new NotFoundException(`Pozycja magazynowa o ID ${id} nie istnieje`);
    }
    return item;
  }

  async create(dto: CreateInventoryItemDto): Promise<InventoryItem> {
    const item = this.inventoryRepository.create({
      ...dto,
      tenantId: currentTenantId(),
    });
    return this.inventoryRepository.save(item);
  }

  async update(id: number, dto: UpdateInventoryItemDto): Promise<InventoryItem> {
    const item = await this.findOne(id);
    Object.assign(item, dto);
    return this.inventoryRepository.save(item);
  }

  async remove(id: number): Promise<void> {
    const item = await this.findOne(id);
    await this.inventoryRepository.remove(item);
  }
}
