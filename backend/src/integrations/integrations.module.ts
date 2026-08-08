import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationConnection } from '../entities/integration-connection.entity';
import { IntegrationSyncLog } from '../entities/integration-sync-log.entity';
import { ProductionOrder } from '../entities/production-order.entity';
import { Tenant } from '../entities/tenant.entity';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { SecretCipherService } from './secret-cipher.service';
import { RestDriver } from './connectors/rest.driver';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IntegrationConnection,
      IntegrationSyncLog,
      ProductionOrder,
      Tenant,
    ]),
  ],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, SecretCipherService, RestDriver],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
