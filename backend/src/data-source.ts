import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'node:path';
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

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
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
  // Ten sam plik działa w dwóch trybach: z `src/` przez ts-node (dev,
  // migration:run) i skompilowany z `dist/` (obraz produkcyjny bez ts-node,
  // migration:run:prod). Rozszerzenie bierzemy z samego pliku — glob `*.ts` w
  // dist złapałby też deklaracje `.d.ts`.
  migrations: [join(__dirname, 'migrations', `*.${__filename.endsWith('.ts') ? 'ts' : 'js'}`)],
  synchronize: false,
  logging: false,
});
