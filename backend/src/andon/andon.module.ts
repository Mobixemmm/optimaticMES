import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AndonAlert } from '../entities/andon-alert.entity';
import { AndonController } from './andon.controller';
import { AndonService } from './andon.service';

@Module({
  imports: [TypeOrmModule.forFeature([AndonAlert])],
  controllers: [AndonController],
  providers: [AndonService],
  exports: [AndonService],
})
export class AndonModule {}
