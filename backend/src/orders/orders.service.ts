import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductionOrder } from '../entities/production-order.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
    constructor(
        @InjectRepository(ProductionOrder)
        private orderRepository: Repository<ProductionOrder>,
    ) {}

    async findAll(): Promise<ProductionOrder[]> {
        return this.orderRepository.find({
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: number): Promise<ProductionOrder> {
        const order = await this.orderRepository.findOne({
            where: { id },
        });
        if (!order) {
            throw new NotFoundException(`Zlecenie o ID ${id} nie istnieje`);
        }
        return order;
    }

    async create(data: CreateOrderDto): Promise<ProductionOrder> {
        const order = this.orderRepository.create(data);
        return this.orderRepository.save(order);
    }

    async updateStatus(id: number, status: string): Promise<ProductionOrder> {
        const order = await this.findOne(id);
        order.status = status as any;

        if (status === 'in_progress') {
            order.actualStart = new Date();
        } else if (status === 'completed') {
            order.actualEnd = new Date();
        }

        return this.orderRepository.save(order);
    }
}