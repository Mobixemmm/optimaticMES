import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QualityDefect } from '../entities/quality-defect.entity';
import { ProductionOrder } from '../entities/production-order.entity';
import { QualityController } from './quality.controller';
import { QualityService } from './quality.service';

@Module({
  imports: [TypeOrmModule.forFeature([QualityDefect, ProductionOrder])],
  controllers: [QualityController],
  providers: [QualityService],
  exports: [QualityService],
})
export class QualityModule {}
