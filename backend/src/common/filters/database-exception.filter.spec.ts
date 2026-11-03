import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { mapQueryFailedError } from './database-exception.filter';

function pgError(code: string): QueryFailedError {
  const driverError = Object.assign(new Error('pg'), {
    code,
    detail: 'Key (order_number)=(Z-1) already exists.',
  });
  return new QueryFailedError('INSERT ...', [], driverError);
}

describe('mapQueryFailedError', () => {
  it('maps a UNIQUE violation to 409', () => {
    expect(mapQueryFailedError(pgError('23505'))).toBeInstanceOf(
      ConflictException,
    );
  });

  it('maps a foreign key violation to 400', () => {
    expect(mapQueryFailedError(pgError('23503'))).toBeInstanceOf(
      BadRequestException,
    );
  });

  it('maps an invalid value (e.g. NaN as int) to 400', () => {
    expect(mapQueryFailedError(pgError('22P02'))).toBeInstanceOf(
      BadRequestException,
    );
  });

  it('keeps unknown database errors as 500', () => {
    expect(mapQueryFailedError(pgError('57P01'))).toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('does not leak the Postgres detail to the client', () => {
    const response = JSON.stringify(
      mapQueryFailedError(pgError('23505')).getResponse(),
    );
    expect(response).not.toContain('order_number');
  });
});
