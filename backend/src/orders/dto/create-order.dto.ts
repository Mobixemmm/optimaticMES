import { IsString, IsInt, IsOptional, IsEnum } from 'class-validator';

export class CreateOrderDto {
    @IsString()
    orderNumber: string;

    @IsString()
    productName: string;

    @IsInt()
    quantity: number;

    @IsEnum(['pending', 'in_progress', 'completed', 'cancelled'])
    @IsOptional()
    status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';

    @IsOptional()
    plannedStart?: Date;

    @IsOptional()
    actualStart?: Date;

    @IsOptional()
    actualEnd?: Date;
}