import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateOrderStatusDto } from './update-order-status.dto';

describe('UpdateOrderStatusDto', () => {
  const errorsFor = (body: unknown) =>
    validate(plainToInstance(UpdateOrderStatusDto, body));

  it.each(['pending', 'in_progress', 'completed', 'cancelled'])(
    'accepts "%s"',
    async (status) => {
      expect(await errorsFor({ status })).toHaveLength(0);
    },
  );

  it.each([{ status: 'lol' }, { status: '' }, {}, { status: 1 }])(
    'rejects %p',
    async (body) => {
      expect((await errorsFor(body)).length).toBeGreaterThan(0);
    },
  );
});
