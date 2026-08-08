import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionOrder } from './entities/production-order.entity';
import { SensorData } from './entities/sensor-data.entity';
import { Operator } from './entities/operator.entity';
import { OperatorSession } from './entities/operator-session.entity';
import { MachineData } from './entities/machine-data.entity';
import { User } from './entities/user.entity';
import { InventoryItem } from './entities/inventory-item.entity';
import { MaintenanceTask } from './entities/maintenance-task.entity';
import { AndonAlert } from './entities/andon-alert.entity';
import { MachineStopEvent } from './entities/machine-stop-event.entity';
import { Machine } from './entities/machine.entity';
import { Shift } from './entities/shift.entity';
import { AuditLog } from './entities/audit-log.entity';
import { Tenant } from './entities/tenant.entity';
import { Site } from './entities/site.entity';
import { Area } from './entities/area.entity';
import { Role } from './entities/role.entity';
import { ModuleConfig } from './entities/module-config.entity';
import { QualityDefect } from './entities/quality-defect.entity';
import { BomItem } from './entities/bom-item.entity';
import { MaterialConsumption } from './entities/material-consumption.entity';
import { IntegrationConnection } from './entities/integration-connection.entity';
import { IntegrationSyncLog } from './entities/integration-sync-log.entity';
import { UserPreference } from './entities/user-preference.entity';
import { MachineConfig } from './entities/machine-config.entity';
import { ScrapCategory } from './entities/scrap-category.entity';
import { ScrapEvent } from './entities/scrap-event.entity';
import { OrdersModule } from './orders/orders.module';
import { SensorsModule } from './sensors/sensors.module';
import { OperatorsModule } from './operators/operators.module';
import { MachineDataModule } from './machine-data/machine-data.module';
import { AuthModule } from './auth/auth.module';
import { InventoryModule } from './inventory/inventory.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { AndonModule } from './andon/andon.module';
import { MachineStopsModule } from './machine-stops/machine-stops.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { HealthModule } from './health/health.module';
import { MachinesModule } from './machines/machines.module';
import { ShiftsModule } from './shifts/shifts.module';
import { AuditModule } from './audit/audit.module';
import { SettingsModule } from './settings/settings.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { QualityModule } from './quality/quality.module';
import { BomModule } from './bom/bom.module';
import { TraceabilityModule } from './traceability/traceability.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { PlanningModule } from './planning/planning.module';
import { PreferencesModule } from './preferences/preferences.module';
import { MachineConfigsModule } from './machine-configs/machine-configs.module';
import { ScrapModule } from './scrap/scrap.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Domyślny limit zapytań dla całego API — dodatkowo zaostrzony przez
    // @Throttle(...) na endpointach logowania (patrz auth/operators controllers).
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: parseInt(configService.get('DATABASE_PORT')!, 10),
        username: configService.get('DATABASE_USERNAME'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [
          ProductionOrder,
          SensorData,
          Operator,
          OperatorSession,
          MachineData,
          User,
          InventoryItem,
          MaintenanceTask,
          AndonAlert,
          MachineStopEvent,
          Machine,
          Shift,
          AuditLog,
          Tenant,
          Site,
          Area,
          Role,
          ModuleConfig,
          QualityDefect,
          BomItem,
          MaterialConsumption,
          IntegrationConnection,
          IntegrationSyncLog,
          UserPreference,
          MachineConfig,
          ScrapCategory,
          ScrapEvent,
        ],
        synchronize: false, // WAŻNE: nie modyfikujemy istniejącej tabeli TimescaleDB
        logging: false,
      }),
      inject: [ConfigService],
    }),
    OrdersModule,
    SensorsModule,
    OperatorsModule,
    MachineDataModule,
    AuthModule,
    InventoryModule,
    MaintenanceModule,
    AndonModule,
    MachineStopsModule,
    AnalyticsModule,
    HealthModule,
    MachinesModule,
    ShiftsModule,
    AuditModule,
    SettingsModule,
    TenancyModule,
    QualityModule,
    BomModule,
    TraceabilityModule,
    IntegrationsModule,
    PlanningModule,
    PreferencesModule,
    MachineConfigsModule,
    ScrapModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
