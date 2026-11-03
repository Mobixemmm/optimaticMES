import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { tenantScope, currentTenantId } from '../common/request-context';
import { ProductionOrder } from '../entities/production-order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderProgressDto } from './dto/update-order-progress.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResult, paginatedResult } from '../common/dto/paginated-result';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(ProductionOrder)
    private orderRepository: Repository<ProductionOrder>,
  ) {}

  async findAll(
    pagination: PaginationQueryDto = {},
  ): Promise<PaginatedResult<ProductionOrder>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 50;
    const [data, total] = await this.orderRepository.findAndCount({
      where: tenantScope(),
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginatedResult(data, total, page, limit);
  }

  async findOne(id: number): Promise<ProductionOrder> {
    const order = await this.orderRepository.findOne({
      where: { id, ...tenantScope() },
    });
    if (!order) {
      throw new NotFoundException(`Zlecenie o ID ${id} nie istnieje`);
    }
    return order;
  }

  async create(data: CreateOrderDto): Promise<ProductionOrder> {
    const order = this.orderRepository.create({
      ...data,
      tenantId: currentTenantId(),
    });
    return this.orderRepository.save(order);
  }

  async updateStatus(
    id: number,
    status: ProductionOrder['status'],
  ): Promise<ProductionOrder> {
    const order = await this.findOne(id);
    order.status = status;

    // Ponowne kliknięcie "Start" (albo wznowienie po pauzie) nie może przesuwać
    // faktycznego startu — od niego liczy się czas pracy i OEE zlecenia.
    if (status === 'in_progress' && !order.actualStart) {
      order.actualStart = new Date();
    } else if (status === 'completed') {
      order.actualEnd = new Date();
    }

    return this.orderRepository.save(order);
  }

  async updateProgress(
    id: number,
    dto: UpdateOrderProgressDto,
  ): Promise<ProductionOrder> {
    const order = await this.findOne(id);
    if (dto.producedQuantity !== undefined) {
      order.producedQuantity = dto.producedQuantity;
    }
    if (dto.scrapQuantity !== undefined) {
      order.scrapQuantity = dto.scrapQuantity;
    }
    return this.orderRepository.save(order);
  }

  async delete(id: number): Promise<void> {
    const order = await this.findOne(id);
    await this.orderRepository.remove(order);
  }
}
