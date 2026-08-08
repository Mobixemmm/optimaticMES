import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { tenantScope, currentTenantId } from '../common/request-context';
import * as bcrypt from 'bcryptjs';
import { Operator } from '../entities/operator.entity';
import { OperatorSession } from '../entities/operator-session.entity';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResult, paginatedResult } from '../common/dto/paginated-result';

const PIN_SALT_ROUNDS = 10;
const GENERIC_LOGIN_ERROR = 'Nieprawidłowa karta lub PIN';

export type PublicOperator = Omit<Operator, 'pinHash'>;

// Hash bcrypt PIN-u nigdy nie powinien trafić do klienta — patrz też
// AuthService.toPublicUser() dla analogicznego wzorca przy hasłach userów.
export function toPublicOperator(operator: Operator): PublicOperator {
  const rest: Partial<Operator> = { ...operator };
  delete rest.pinHash;
  return rest as PublicOperator;
}

@Injectable()
export class OperatorsService {
  constructor(
    @InjectRepository(Operator)
    private operatorRepository: Repository<Operator>,
    @InjectRepository(OperatorSession)
    private sessionRepository: Repository<OperatorSession>,
  ) {}

  // Znajdź operatora po RFID
  async findByRfid(rfidCardId: string): Promise<Operator | null> {
    return this.operatorRepository.findOne({
      where: { rfidCardId, isActive: true, ...tenantScope() },
    });
  }

  // Logowanie przez RFID + PIN (dwa czynniki: posiadanie karty + wiedza PIN-u)
  async loginWithRfid(
    rfidCardId: string,
    pin: string,
  ): Promise<{ operator: Operator; session: OperatorSession }> {
    const operator = await this.findByRfid(rfidCardId);

    // Zawsze porównujemy z jakimś hashem (nawet gdy operator nie istnieje),
    // żeby czas odpowiedzi nie zdradzał, czy karta jest zarejestrowana.
    const hashToCompare =
      operator?.pinHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinval';
    const pinMatches = await bcrypt.compare(pin, hashToCompare);

    if (!operator || !operator.pinHash || !pinMatches) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    // Zamknij poprzednie sesje
    await this.sessionRepository.update(
      { operatorId: operator.id, isActive: true, ...tenantScope() },
      { isActive: false, logoutTime: new Date() },
    );

    // Stwórz nową sesję
    const session = this.sessionRepository.create({
      operatorId: operator.id,
      rfidCardId,
      tenantId: currentTenantId(),
    });

    const savedSession = await this.sessionRepository.save(session);

    return { operator, session: savedSession };
  }

  // Wylogowanie
  async logout(sessionId: number): Promise<void> {
    await this.sessionRepository.update(
      { id: sessionId, ...tenantScope() },
      { isActive: false, logoutTime: new Date() },
    );
  }

  // Sprawdź aktywną sesję
  async getActiveSession(rfidCardId: string): Promise<OperatorSession | null> {
    return this.sessionRepository.findOne({
      where: { rfidCardId, isActive: true, ...tenantScope() },
      relations: { operator: true }, // NOWA SKŁADNIA TypeORM
    });
  }

  // Dodaj operatora
  async create(dto: CreateOperatorDto): Promise<Operator> {
    const { pinCode, ...rest } = dto;
    const pinHash = await bcrypt.hash(pinCode, PIN_SALT_ROUNDS);
    const operator = this.operatorRepository.create({
      ...rest,
      pinHash,
      tenantId: currentTenantId(),
    });
    return this.operatorRepository.save(operator);
  }

  // Lista operatorów (stronicowana)
  async findAll(
    pagination: PaginationQueryDto = {},
  ): Promise<PaginatedResult<Operator>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 50;
    const [data, total] = await this.operatorRepository.findAndCount({
      where: tenantScope(),
      order: { lastName: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginatedResult(data, total, page, limit);
  }

  // Pobierz operatora po ID
  async findOne(id: number): Promise<Operator> {
    const operator = await this.operatorRepository.findOne({
      where: { id, ...tenantScope() },
    });
    if (!operator) {
      throw new NotFoundException(`Operator o ID ${id} nie istnieje`);
    }
    return operator;
  }

  // Edytuj operatora
  async update(id: number, dto: UpdateOperatorDto): Promise<Operator> {
    const operator = await this.findOne(id);
    const { pinCode, ...rest } = dto;
    Object.assign(operator, rest);
    if (pinCode) {
      operator.pinHash = await bcrypt.hash(pinCode, PIN_SALT_ROUNDS);
    }
    return this.operatorRepository.save(operator);
  }

  // Usuń operatora
  async remove(id: number): Promise<void> {
    const operator = await this.findOne(id);
    await this.operatorRepository.remove(operator);
  }
}
