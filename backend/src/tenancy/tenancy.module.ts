import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../entities/tenant.entity';
import { Site } from '../entities/site.entity';
import { Area } from '../entities/area.entity';
import { Machine } from '../entities/machine.entity';
import { TenantResolverService } from './tenant-resolver.service';
import { TenancyService } from './tenancy.service';
import { TenancyController } from './tenancy.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, Site, Area, Machine])],
  controllers: [TenancyController],
  providers: [TenantResolverService, TenancyService],
  // TenantResolverService trafia do AuthModule (RequestContextGuard) — dlatego
  // ten moduł nie może importować AuthModule, bo powstałby cykl.
  exports: [TenantResolverService],
})
export class TenancyModule {}
