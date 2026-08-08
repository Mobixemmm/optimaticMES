import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModuleConfig } from '../entities/module-config.entity';
import { Tenant } from '../entities/tenant.entity';
import { Site } from '../entities/site.entity';
import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';
import { ModulesService } from './modules.service';
import { ModulesController } from './modules.controller';
import { BootstrapController } from './bootstrap.controller';
import { IndustryPacksService } from './industry-packs.service';
import { IndustryPacksController } from './industry-packs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ModuleConfig, Tenant, Site, Role, User])],
  controllers: [ModulesController, BootstrapController, IndustryPacksController],
  providers: [ModulesService, IndustryPacksService],
  // ModulesService jest eksportowany, bo serwisy domenowe muszą móc uszanować
  // ustawienie modułu po stronie serwera, a nie tylko ukryć przycisk w UI.
  exports: [ModulesService],
})
export class SettingsModule {}
