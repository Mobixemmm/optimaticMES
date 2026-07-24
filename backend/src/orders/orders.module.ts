import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionOrder } from '../entities/production-order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
    imports: [TypeOrmModule.forFeature([ProductionOrder])],
    controllers: [OrdersController],
    providers: [OrdersService],
})
export class OrdersModule {}