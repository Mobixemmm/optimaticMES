import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProductionOrder } from '../../entities/production-order.entity';

export const ORDER_STATUSES: ProductionOrder['status'][] = [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
];

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ORDER_STATUSES })
  @IsIn(ORDER_STATUSES, {
    message: `status musi być jednym z: ${ORDER_STATUSES.join(', ')}`,
  })
  status: ProductionOrder['status'];
}
