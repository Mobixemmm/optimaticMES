import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { tenantScope, currentTenantId } from '../common/request-context';
import { MaintenanceTask } from '../entities/maintenance-task.entity';
import { CreateMaintenanceTaskDto } from './dto/create-maintenance-task.dto';
import { UpdateMaintenanceTaskDto } from './dto/update-maintenance-task.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResult, paginatedResult } from '../common/dto/paginated-result';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(MaintenanceTask)
    private maintenanceRepository: Repository<MaintenanceTask>,
  ) {}

  async findAll(
    pagination: PaginationQueryDto = {},
  ): Promise<PaginatedResult<MaintenanceTask>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 50;
    const [data, total] = await this.maintenanceRepository.findAndCount({
      where: tenantScope(),
      order: { dueDate: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginatedResult(data, total, page, limit);
  }

  async findOne(id: number): Promise<MaintenanceTask> {
    const task = await this.maintenanceRepository.findOne({
      where: { id, ...tenantScope() },
    });
    if (!task) {
      throw new NotFoundException(`Zgłoszenie serwisowe o ID ${id} nie istnieje`);
    }
    return task;
  }

  async create(dto: CreateMaintenanceTaskDto): Promise<MaintenanceTask> {
    const task = this.maintenanceRepository.create({
      ...dto,
      tenantId: currentTenantId(),
    });
    return this.maintenanceRepository.save(task);
  }

  async update(id: number, dto: UpdateMaintenanceTaskDto): Promise<MaintenanceTask> {
    const task = await this.findOne(id);
    Object.assign(task, dto);
    return this.maintenanceRepository.save(task);
  }

  async remove(id: number): Promise<void> {
    const task = await this.findOne(id);
    await this.maintenanceRepository.remove(task);
  }
}
