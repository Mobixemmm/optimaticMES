import { BadRequestException } from '@nestjs/common';
import { RestDriver } from './rest.driver';
import type { DriverContext } from './driver.interface';

function ctx(config: Record<string, unknown>, secrets: Record<string, string> = {}): DriverContext {
  return { config: { baseUrl: 'https://erp.example.com', ...config }, secrets };
}

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(''),
  } as unknown as Response;
}

describe('RestDriver', () => {
  let driver: RestDriver;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    driver = new RestDriver();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('mapuje pola według konfiguracji klienta', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([{ nr_zlecenia: 'WO-1', wyrob: 'Obudowa', ilosc: 25 }]),
    );

    const orders = await driver.pullOrders(
      ctx({
        ordersPath: '/orders',
        fieldMap: '{"orderNumber":"nr_zlecenia","productName":"wyrob","quantity":"ilosc"}',
      }),
    );

    expect(orders).toEqual([
      { orderNumber: 'WO-1', productName: 'Obudowa', quantity: 25, plannedStart: null, idealCycleTimeSec: null },
    ]);
  });

  it('sięga po tablicę zagnieżdżoną w odpowiedzi', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ data: { items: [{ orderNumber: 'WO-9', productName: 'X', quantity: 5 }] } }),
    );

    const orders = await driver.pullOrders(ctx({ ordersPath: '/orders', rootPath: 'data.items' }));

    expect(orders).toHaveLength(1);
    expect(orders[0].orderNumber).toBe('WO-9');
  });

  it('pomija rekordy bez numeru zlecenia albo bez ilości', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        { orderNumber: 'WO-1', productName: 'Dobry', quantity: 10 },
        { orderNumber: '', productName: 'Bez numeru', quantity: 5 },
        { orderNumber: 'WO-3', productName: 'Bez ilości', quantity: 0 },
      ]),
    );

    const orders = await driver.pullOrders(ctx({ ordersPath: '/orders' }));

    expect(orders).toHaveLength(1);
    expect(orders[0].orderNumber).toBe('WO-1');
  });

  it('wysyła token Bearer w nagłówku', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await driver.pullOrders(ctx({ ordersPath: '/orders', authType: 'bearer' }, { token: 'abc' }));

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer abc');
  });

  it('składa nagłówek Basic z loginu i hasła', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await driver.pullOrders(
      ctx({ ordersPath: '/orders', authType: 'basic', username: 'mes' }, { token: 'haslo' }),
    );

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Basic ' + Buffer.from('mes:haslo').toString('base64'));
  });

  it('odrzuca adres o schemacie innym niż http(s)', async () => {
    await expect(
      driver.pullOrders({ config: { baseUrl: 'file:///etc', ordersPath: '/x' }, secrets: {} }),
    ).rejects.toThrow(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('zgłasza czytelny błąd przy niepoprawnym mapowaniu pól', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ orderNumber: 'WO-1', quantity: 1 }]));

    await expect(
      driver.pullOrders(ctx({ ordersPath: '/orders', fieldMap: 'to-nie-json' })),
    ).rejects.toThrow(/JSON/);
  });

  it('przekazuje status błędu z systemu zewnętrznego', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: () => Promise.resolve('brak uprawnien'),
    } as unknown as Response);

    await expect(driver.pullOrders(ctx({ ordersPath: '/orders' }))).rejects.toThrow(/401/);
  });

  it('podmienia numer zlecenia w ścieżce raportowania postępu', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await driver.pushProgress(
      ctx({ progressPath: '/orders/{orderNumber}/progress' }),
      { orderNumber: 'WO-1', producedQuantity: 10, scrapQuantity: 1, status: 'in_progress' },
    );

    expect(fetchMock.mock.calls[0][0]).toBe('https://erp.example.com/orders/WO-1/progress');
  });
});
