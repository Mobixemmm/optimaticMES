import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { tenantScope, currentTenantId } from '../common/request-context';
import { IntegrationConnection } from '../entities/integration-connection.entity';
import {
  IntegrationSyncLog,
  SyncOperation,
} from '../entities/integration-sync-log.entity';
import { ProductionOrder } from '../entities/production-order.entity';
import { Tenant } from '../entities/tenant.entity';
import {
  CONNECTOR_DEFINITIONS,
  ConnectorDefinition,
  connectorsForIndustry,
  findConnector,
} from './connectors/connector.registry';
import type {
  DriverContext,
  IntegrationDriver,
  ProgressPayload,
} from './connectors/driver.interface';
import { RestDriver } from './connectors/rest.driver';
import { SecretCipherService } from './secret-cipher.service';
import { CreateConnectionDto, UpdateConnectionDto } from './dto/upsert-connection.dto';

// Połączenie w postaci bezpiecznej do wysłania do przeglądarki: zamiast wartości
// sekretów leci wyłącznie informacja, czy w ogóle są ustawione.
export interface MaskedConnection {
  id: number;
  connectorKey: string;
  connectorName: string;
  kind: string;
  status: string;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  secretsSet: string[];
  lastError: string | null;
  lastSyncAt: Date | null;
  capabilities: string[];
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);
  private readonly drivers: Map<string, IntegrationDriver>;

  constructor(
    @InjectRepository(IntegrationConnection)
    private connectionRepository: Repository<IntegrationConnection>,
    @InjectRepository(IntegrationSyncLog)
    private logRepository: Repository<IntegrationSyncLog>,
    @InjectRepository(ProductionOrder)
    private orderRepository: Repository<ProductionOrder>,
    @InjectRepository(Tenant)
    private tenantRepository: Repository<Tenant>,
    private cipher: SecretCipherService,
    restDriver: RestDriver,
  ) {
    // Rejestr sterowników. Nowy system zewnętrzny = jedna klasa i jedna linijka tutaj.
    this.drivers = new Map([[restDriver.key, restDriver]]);
  }

  // --- Katalog konektorów ----------------------------------------------

  async listConnectors(): Promise<ConnectorDefinition[]> {
    const tenant = await this.tenantRepository.findOne({
      where: { id: currentTenantId() },
    });
    return connectorsForIndustry(tenant?.industryPack ?? null);
  }

  // --- Połączenia -------------------------------------------------------

  async listConnections(): Promise<MaskedConnection[]> {
    const rows = await this.connectionRepository.find({
      where: tenantScope(),
      order: { id: 'ASC' },
    });
    return rows.map((row) => this.mask(row));
  }

  async findOne(id: number): Promise<IntegrationConnection> {
    const connection = await this.connectionRepository.findOne({
      where: { id, ...tenantScope() },
    });
    if (!connection) {
      throw new NotFoundException(`Połączenie o ID ${id} nie istnieje`);
    }
    return connection;
  }

  async create(dto: CreateConnectionDto): Promise<MaskedConnection> {
    const definition = this.requireConnector(dto.connectorKey);
    const { config, secrets } = this.splitFields(definition, dto.config ?? {}, dto.secrets ?? {});

    const connection = this.connectionRepository.create({
      tenantId: currentTenantId(),
      connectorKey: definition.key,
      name: dto.name,
      enabled: false,
      config,
      secretsEncrypted:
        Object.keys(secrets).length > 0 ? this.cipher.encryptObject(secrets) : null,
      status: 'unconfigured',
      lastError: null,
      lastSyncAt: null,
    });
    return this.mask(await this.connectionRepository.save(connection));
  }

  async update(id: number, dto: UpdateConnectionDto): Promise<MaskedConnection> {
    const connection = await this.findOne(id);
    const definition = this.requireConnector(connection.connectorKey);

    if (dto.name !== undefined) connection.name = dto.name;
    if (dto.enabled !== undefined) connection.enabled = dto.enabled;

    if (dto.config !== undefined || dto.secrets !== undefined) {
      const existingSecrets = this.cipher.decryptObject(connection.secretsEncrypted);
      const { config, secrets } = this.splitFields(
        definition,
        { ...connection.config, ...(dto.config ?? {}) },
        dto.secrets ?? {},
      );

      // Sekret nieprzysłany zostaje bez zmian, przysłany pusty — kasowany.
      const merged = { ...existingSecrets };
      for (const [key, value] of Object.entries(secrets)) {
        if (value === '') delete merged[key];
        else merged[key] = value;
      }

      connection.config = config;
      connection.secretsEncrypted =
        Object.keys(merged).length > 0 ? this.cipher.encryptObject(merged) : null;
    }

    return this.mask(await this.connectionRepository.save(connection));
  }

  async remove(id: number): Promise<void> {
    const connection = await this.findOne(id);
    await this.connectionRepository.remove(connection);
  }

  // --- Działanie --------------------------------------------------------

  async test(id: number): Promise<{ ok: boolean; message: string }> {
    const connection = await this.findOne(id);
    const { driver, ctx } = await this.prepare(connection);
    const startedAt = new Date();

    try {
      const result = await driver.test(ctx);
      await this.finish(connection, 'test', startedAt, {
        status: 'success',
        message: result.message,
      });
      return result;
    } catch (err) {
      const message = this.errorMessage(err);
      await this.finish(connection, 'test', startedAt, { status: 'error', message });
      return { ok: false, message };
    }
  }

  /**
   * Pobiera zlecenia z systemu zewnętrznego i scala je z bazą MES.
   * Dopasowanie po numerze zlecenia: istniejące jest aktualizowane, nowe zakładane.
   * Zlecenia rozpoczęte lub zamknięte NIE są nadpisywane — ERP nie ma prawa
   * cofnąć postępu zaraportowanego na hali.
   */
  async syncOrders(id: number): Promise<{ read: number; written: number; message: string }> {
    const connection = await this.findOne(id);
    const { driver, ctx, definition } = await this.prepare(connection);
    if (!definition.capabilities.includes('pull_orders') || !driver.pullOrders) {
      throw new BadRequestException(
        `Konektor „${definition.name}" nie obsługuje pobierania zleceń.`,
      );
    }
    const startedAt = new Date();

    try {
      const external = await driver.pullOrders(ctx);
      let written = 0;
      let skipped = 0;

      for (const row of external) {
        const existing = await this.orderRepository.findOne({
          where: { orderNumber: row.orderNumber, ...tenantScope() },
        });

        if (existing) {
          if (existing.status !== 'pending') {
            skipped++;
            continue;
          }
          existing.productName = row.productName;
          existing.quantity = row.quantity;
          existing.plannedStart = row.plannedStart ?? existing.plannedStart;
          if (row.idealCycleTimeSec != null) {
            existing.idealCycleTimeSec = row.idealCycleTimeSec;
          }
          await this.orderRepository.save(existing);
        } else {
          await this.orderRepository.save(
            this.orderRepository.create({
              tenantId: currentTenantId(),
              orderNumber: row.orderNumber,
              productName: row.productName,
              quantity: row.quantity,
              producedQuantity: 0,
              scrapQuantity: 0,
              idealCycleTimeSec: row.idealCycleTimeSec ?? null,
              status: 'pending',
              plannedStart: row.plannedStart ?? null,
              actualStart: null,
              actualEnd: null,
            }),
          );
        }
        written++;
      }

      const message =
        `Pobrano ${external.length}, zapisano ${written}` +
        (skipped > 0 ? `, pominięto ${skipped} (już w toku lub zamknięte)` : '');
      await this.finish(connection, 'pull_orders', startedAt, {
        status: 'success',
        message,
        recordsRead: external.length,
        recordsWritten: written,
      });
      return { read: external.length, written, message };
    } catch (err) {
      const message = this.errorMessage(err);
      await this.finish(connection, 'pull_orders', startedAt, { status: 'error', message });
      throw new BadRequestException(message);
    }
  }

  /** Odesłanie postępu zlecenia do systemu zewnętrznego. */
  async pushProgress(id: number, payload: ProgressPayload): Promise<void> {
    const connection = await this.findOne(id);
    const { driver, ctx, definition } = await this.prepare(connection);
    if (!definition.capabilities.includes('push_progress') || !driver.pushProgress) {
      throw new BadRequestException(
        `Konektor „${definition.name}" nie obsługuje raportowania postępu.`,
      );
    }
    const startedAt = new Date();
    try {
      await driver.pushProgress(ctx, payload);
      await this.finish(connection, 'push_progress', startedAt, {
        status: 'success',
        message: `Wysłano postęp zlecenia ${payload.orderNumber}`,
        recordsWritten: 1,
      });
    } catch (err) {
      const message = this.errorMessage(err);
      await this.finish(connection, 'push_progress', startedAt, { status: 'error', message });
      throw new BadRequestException(message);
    }
  }

  async logs(id: number, limit = 20): Promise<IntegrationSyncLog[]> {
    await this.findOne(id);
    return this.logRepository.find({
      where: { connectionId: id, ...tenantScope() },
      order: { startedAt: 'DESC' },
      take: Math.min(limit, 100),
    });
  }

  // --- Pomocnicze -------------------------------------------------------

  private requireConnector(key: string): ConnectorDefinition {
    const definition = findConnector(key);
    if (!definition) {
      throw new BadRequestException(
        `Nieznany konektor: ${key}. Dostępne: ${CONNECTOR_DEFINITIONS.map((c) => c.key).join(', ')}`,
      );
    }
    return definition;
  }

  private async prepare(connection: IntegrationConnection): Promise<{
    driver: IntegrationDriver;
    ctx: DriverContext;
    definition: ConnectorDefinition;
  }> {
    const definition = this.requireConnector(connection.connectorKey);
    if (definition.status === 'planned') {
      throw new BadRequestException(
        `Konektor „${definition.name}" jest zapowiedziany, ale nie ma jeszcze sterownika. ` +
          'Na razie użyj konektora „Uniwersalny REST / JSON".',
      );
    }
    const driver = this.drivers.get(definition.driver);
    if (!driver) {
      throw new BadRequestException(
        `Sterownik „${definition.driver}" nie jest zarejestrowany w tej wersji aplikacji.`,
      );
    }
    return {
      driver,
      definition,
      ctx: {
        config: connection.config ?? {},
        secrets: this.cipher.decryptObject(connection.secretsEncrypted),
      },
    };
  }

  // Rozdziela przysłane pola na jawne i wrażliwe według rejestru — o tym, co
  // jest sekretem, decyduje definicja konektora, a nie nazwa pola z żądania.
  private splitFields(
    definition: ConnectorDefinition,
    incomingConfig: Record<string, unknown>,
    incomingSecrets: Record<string, string>,
  ): { config: Record<string, unknown>; secrets: Record<string, string> } {
    const secretKeys = new Set(definition.fields.filter((f) => f.secret).map((f) => f.key));
    const publicKeys = new Set(definition.fields.filter((f) => !f.secret).map((f) => f.key));

    const config: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(incomingConfig)) {
      // Sekret przysłany omyłkowo w `config` i tak trafia do worka na sekrety,
      // zamiast wylądować w jawnej kolumnie jsonb.
      if (publicKeys.has(key)) config[key] = value;
      else if (secretKeys.has(key)) incomingSecrets[key] = String(value ?? '');
    }

    const secrets: Record<string, string> = {};
    for (const [key, value] of Object.entries(incomingSecrets)) {
      if (secretKeys.has(key)) secrets[key] = String(value ?? '');
    }
    return { config, secrets };
  }

  private mask(connection: IntegrationConnection): MaskedConnection {
    const definition = findConnector(connection.connectorKey);
    let secretsSet: string[] = [];
    try {
      secretsSet = Object.entries(this.cipher.decryptObject(connection.secretsEncrypted))
        .filter(([, value]) => value !== '')
        .map(([key]) => key);
    } catch {
      // Nieodszyfrowywalny worek (np. po rotacji klucza) nie może wywalić listy
      // połączeń — admin musi móc wejść i wpisać dane ponownie.
      this.logger.warn(
        `Nie udało się odszyfrować sekretów połączenia ${connection.id} — wymagane ponowne wprowadzenie.`,
      );
    }

    return {
      id: connection.id,
      connectorKey: connection.connectorKey,
      connectorName: definition?.name ?? connection.connectorKey,
      kind: definition?.kind ?? 'erp',
      status: connection.status,
      name: connection.name,
      enabled: connection.enabled,
      config: connection.config ?? {},
      secretsSet,
      lastError: connection.lastError,
      lastSyncAt: connection.lastSyncAt,
      capabilities: definition?.capabilities ?? [],
    };
  }

  private errorMessage(err: unknown): string {
    const raw = err instanceof Error ? err.message : String(err);
    return raw.slice(0, 500);
  }

  private async finish(
    connection: IntegrationConnection,
    operation: SyncOperation,
    startedAt: Date,
    result: {
      status: 'success' | 'error';
      message: string;
      recordsRead?: number;
      recordsWritten?: number;
    },
  ): Promise<void> {
    await this.logRepository.save(
      this.logRepository.create({
        tenantId: currentTenantId(),
        connectionId: connection.id,
        operation,
        status: result.status,
        recordsRead: result.recordsRead ?? 0,
        recordsWritten: result.recordsWritten ?? 0,
        message: result.message,
        durationMs: Date.now() - startedAt.getTime(),
        startedAt,
      }),
    );

    connection.status = result.status === 'success' ? 'ok' : 'error';
    connection.lastError = result.status === 'error' ? result.message : null;
    if (result.status === 'success' && operation !== 'test') {
      connection.lastSyncAt = new Date();
    }
    await this.connectionRepository.save(connection);
  }
}
