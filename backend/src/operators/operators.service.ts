import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Operator } from '../entities/operator.entity';
import { OperatorSession } from '../entities/operator-session.entity';

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
            where: { rfidCardId, isActive: true },
        });
    }

    // Logowanie przez RFID
    async loginWithRfid(rfidCardId: string): Promise<{ operator: Operator; session: OperatorSession }> {
        const operator = await this.findByRfid(rfidCardId);
        
        if (!operator) {
            throw new UnauthorizedException('Nieznana karta RFID');
        }

        // Zamknij poprzednie sesje
        await this.sessionRepository.update(
            { operatorId: operator.id, isActive: true },
            { isActive: false, logoutTime: new Date() }
        );

        // Stwórz nową sesję
        const session = this.sessionRepository.create({
            operatorId: operator.id,
            rfidCardId,
        });
        
        const savedSession = await this.sessionRepository.save(session);

        return { operator, session: savedSession };
    }

    // Wylogowanie
    async logout(sessionId: number): Promise<void> {
        await this.sessionRepository.update(sessionId, {
            isActive: false,
            logoutTime: new Date(),
        });
    }

    // Sprawdź aktywną sesję
    async getActiveSession(rfidCardId: string): Promise<OperatorSession | null> {
        return this.sessionRepository.findOne({
            where: { rfidCardId, isActive: true },
            relations: { operator: true },  // NOWA SKŁADNIA TypeORM
        });
    }

    // Dodaj operatora (do seedowania)
    async create(data: Partial<Operator>): Promise<Operator> {
        const operator = this.operatorRepository.create(data);
        return this.operatorRepository.save(operator);
    }

    // Lista operatorów
    async findAll(): Promise<Operator[]> {
        return this.operatorRepository.find();
    }
}