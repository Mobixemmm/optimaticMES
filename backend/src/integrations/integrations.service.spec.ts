import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { IntegrationsService } from './integrations.service';
import { SecretCipherService } from './secret-cipher.service';
import { RestDriver } from './connectors/rest.driver';
import { IntegrationConnection } from '../entities/integration-connection.entity';
import { IntegrationSyncLog } from '../entities/integration-sync-log.entity';
import { ProductionOrder } from '../entities/production-order.entity';
import { Tenant } from '../entities/tenant.entity';
import {
  enterTestRequestContext,
  TEST_TENANT_ID,
} from '../common/testing/request-context.testing';

type MockRepo<T extends ObjectLiteral> = Partial<Record<keyof Repository<T>, jest.Mock>>;

function connection(overrides: Partial<IntegrationConnection> = {}): IntegrationConnection {
  return {
    id: 1,
    tenantId: TEST_TENANT_ID,
    connectorKey: 'rest-generic',
    name: 'ERP produkcja',
    enabled: true,
    config: { baseUrl: 'https://erp.example.com', ordersPath: '/orders', authType: 'bearer' },
    secretsEncrypted: null,
    status: 'ok',
    lastError: null,
    lastSyncAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as IntegrationConnection;
}

describe('IntegrationsService', () => {
  let service: IntegrationsService;
  let cipher: SecretCipherService;
  let connectionRepo: MockRepo<IntegrationConnection>;
  let logRepo: MockRepo<IntegrationSyncLog>;
  let orderRepo: MockRepo<ProductionOrder>;
  let tenantRepo: MockRepo<Tenant>;
  let restDriver: RestDriver;

  beforeEach(async () => {
    enterTestRequestContext();
    process.env.INTEGRATION_ENCRYPTION_KEY = 'c'.repeat(64);
    cipher = new SecretCipherService();

    connectionRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(connection()),
      create: jest.fn((d) => d as IntegrationConnection),
      save: jest.fn((d) => Promise.resolve({ id: 1, ...d })),
      remove: jest.fn(),
    };
    logRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((d) => d as IntegrationSyncLog),
      save: jest.fn((d) => Promise.resolve(d)),
    };
    orderRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((d) => d as ProductionOrder),
      save: jest.fn((d) => Promise.resolve(d)),
    };
    tenantRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 1, industryPack: 'factory' } as Tenant),
    };
    restDriver = new RestDriver();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationsService,
        { provide: SecretCipherService, useValue: cipher },
        { provide: RestDriver, useValue: restDriver },
        { provide: getRepositoryToken(IntegrationConnection), useValue: connectionRepo },
        { provide: getRepositoryToken(IntegrationSyncLog), useValue: logRepo },
        { provide: getRepositoryToken(ProductionOrder), useValue: orderRepo },
        { provide: getRepositoryToken(Tenant), useValue: tenantRepo },
      ],
    }).compile();

    service = module.get<IntegrationsService>(IntegrationsService);
  });

  describe('katalog konektorów', () => {
    it('pokazuje uniwersalne i branżowe, ale nie z obcych branż', async () => {
      const list = await service.listConnectors();
      const keys = list.map((c) => c.key);

      expect(keys).toContain('rest-generic');
      expect(keys).toContain('sap-s4hana');
      // Fabryka nie ma po co widzieć konektora do sortowni bagażu.
      expect(keys).not.toContain('bhs-events');
    });

    it('lotnisko widzi konektory lotniskowe zamiast fabrycznych', async () => {
      tenantRepo.findOne!.mockResolvedValue({ id: 1, industryPack: 'airport' } as Tenant);
      const keys = (await service.listConnectors()).map((c) => c.key);

      expect(keys).toContain('aodb-rest');
      expect(keys).toContain('bhs-events');
      expect(keys).not.toContain('sap-s4hana');
    });
  });

  describe('sekrety', () => {
    it('nie zwraca wartości sekretu, tylko informację że jest ustawiony', async () => {
      connectionRepo.find!.mockResolvedValue([
        connection({ secretsEncrypted: cipher.encryptObject({ token: 'tajne-haslo' }) }),
      ]);

      const [masked] = await service.listConnections();
      const serialized = JSON.stringify(masked);

      expect(masked.secretsSet).toEqual(['token']);
      expect(serialized).not.toContain('tajne-haslo');
    });

    it('kieruje pole oznaczone jako sekret do zaszyfrowanego worka, nie do jawnego config', async () => {
      await service.create({
        connectorKey: 'rest-generic',
        name: 'ERP',
        config: { baseUrl: 'https://erp.example.com', token: 'przez-pomylke-w-config' },
      });

      const saved = connectionRepo.save!.mock.calls[0][0] as IntegrationConnection;
      expect(saved.config).not.toHaveProperty('token');
      expect(cipher.decryptObject(saved.secretsEncrypted)).toEqual({
        token: 'przez-pomylke-w-config',
      });
    });

    it('edycja bez podania sekretu nie kasuje zapisanego hasła', async () => {
      connectionRepo.findOne!.mockResolvedValue(
        connection({ secretsEncrypted: cipher.encryptObject({ token: 'stare' }) }),
      );

      await service.update(1, { name: 'Nowa nazwa' });

      const saved = connectionRepo.save!.mock.calls[0][0] as IntegrationConnection;
      expect(cipher.decryptObject(saved.secretsEncrypted)).toEqual({ token: 'stare' });
    });

    it('pusty string kasuje zapisany sekret', async () => {
      connectionRepo.findOne!.mockResolvedValue(
        connection({ secretsEncrypted: cipher.encryptObject({ token: 'stare' }) }),
      );

      await service.update(1, { secrets: { token: '' } });

      const saved = connectionRepo.save!.mock.calls[0][0] as IntegrationConnection;
      expect(saved.secretsEncrypted).toBeNull();
    });

    it('lista połączeń działa mimo nieodszyfrowywalnego worka', async () => {
      connectionRepo.find!.mockResolvedValue([
        connection({ secretsEncrypted: 'v1:00:00:00' }),
      ]);

      const [masked] = await service.listConnections();
      expect(masked.secretsSet).toEqual([]);
      expect(masked.name).toBe('ERP produkcja');
    });
  });

  describe('konektory zapowiedziane', () => {
    it('odmawia użycia konektora bez sterownika, zamiast udawać że działa', async () => {
      connectionRepo.findOne!.mockResolvedValue(connection({ connectorKey: 'sap-s4hana' }));

      await expect(service.test(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('synchronizacja zleceń', () => {
    it('zakłada nowe zlecenia i nie nadpisuje tych już w toku', async () => {
      jest.spyOn(restDriver, 'pullOrders').mockResolvedValue([
        { orderNumber: 'WO-100', productName: 'Obudowa', quantity: 50 },
        { orderNumber: 'WO-200', productName: 'Pokrywa', quantity: 30 },
      ]);
      orderRepo.findOne!.mockImplementation(({ where }: any) =>
        Promise.resolve(
          where.orderNumber === 'WO-200'
            ? ({ id: 9, orderNumber: 'WO-200', status: 'in_progress', producedQuantity: 12 } as ProductionOrder)
            : null,
        ),
      );

      const result = await service.syncOrders(1);

      expect(result.read).toBe(2);
      expect(result.written).toBe(1);
      expect(result.message).toContain('pominięto 1');
      // Zlecenie w toku nie może zostać cofnięte przez import z ERP.
      expect(orderRepo.save).toHaveBeenCalledTimes(1);
    });

    it('zapisuje nieudaną synchronizację w dzienniku i oznacza połączenie jako błędne', async () => {
      jest.spyOn(restDriver, 'pullOrders').mockRejectedValue(new Error('ERP nie odpowiada'));

      await expect(service.syncOrders(1)).rejects.toThrow(BadRequestException);

      const log = logRepo.create!.mock.calls[0][0] as IntegrationSyncLog;
      expect(log.status).toBe('error');
      expect(log.message).toContain('ERP nie odpowiada');
    });
  });
});
