import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';

// Kody błędów PostgreSQL, które są winą danych wejściowych, a nie serwera.
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';
const PG_CHECK_VIOLATION = '23514';
const PG_NOT_NULL_VIOLATION = '23502';
const PG_INVALID_TEXT_REPRESENTATION = '22P02';

interface PgDriverError {
  code?: string;
  detail?: string;
  constraint?: string;
}

// Mapuje naruszenia ograniczeń bazy na 4xx. Bez tego duplikat numeru
// zlecenia, karty RFID albo odwołanie do maszyny spoza kartoteki (klucze obce
// z migracji MachineForeignKeys) kończyły się anonimowym 500, a frontend nie
// miał czego pokazać operatorowi.
//
// Treść `detail` z Postgresa świadomie NIE trafia do klienta (zawiera nazwy
// kolumn i wartości) — idzie tylko do logu.
export function mapQueryFailedError(error: QueryFailedError): HttpException {
  const driverError = (
    error as QueryFailedError & { driverError?: PgDriverError }
  ).driverError;
  const code = driverError?.code ?? (error as PgDriverError).code;

  switch (code) {
    case PG_UNIQUE_VIOLATION:
      return new ConflictException('Rekord o takich danych już istnieje');
    case PG_FOREIGN_KEY_VIOLATION:
      return new BadRequestException(
        'Wskazany powiązany rekord (np. maszyna, zlecenie) nie istnieje albo jest jeszcze używany',
      );
    case PG_CHECK_VIOLATION:
    case PG_NOT_NULL_VIOLATION:
    case PG_INVALID_TEXT_REPRESENTATION:
      return new BadRequestException('Nieprawidłowe dane wejściowe');
    default:
      return new InternalServerErrorException();
  }
}

@Catch(QueryFailedError)
export class DatabaseExceptionFilter
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  catch(error: QueryFailedError, host: ArgumentsHost) {
    const mapped = mapQueryFailedError(error);
    if (mapped.getStatus() >= 500) {
      this.logger.error(error.message, error.stack);
    } else {
      const driverError = (
        error as QueryFailedError & { driverError?: PgDriverError }
      ).driverError;
      this.logger.warn(
        `${mapped.getStatus()} z bazy: ${driverError?.code ?? '?'} ${driverError?.constraint ?? ''} ${driverError?.detail ?? ''}`.trim(),
      );
    }
    super.catch(mapped, host);
  }
}
