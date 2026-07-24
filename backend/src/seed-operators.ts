import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Operator } from './entities/operator.entity';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const operatorRepo = app.get(getRepositoryToken(Operator));

    const operators = [
        {
            firstName: 'Jan',
            lastName: 'Kowalski',
            rfidCardId: 'A3F29B1C4D5E',
            pinCode: '1234',
        },
        {
            firstName: 'Anna',
            lastName: 'Nowak',
            rfidCardId: 'B7E18C2F6A0D',
            pinCode: '5678',
        },
        {
            firstName: 'Piotr',
            lastName: 'Wiśniewski',
            rfidCardId: 'C5D40A9E3B7F',
            pinCode: '9012',
        },
    ];

    for (const op of operators) {
        const exists = await operatorRepo.findOne({ where: { rfidCardId: op.rfidCardId } });
        if (!exists) {
            await operatorRepo.save(op);
            console.log(`✅ Dodano operatora: ${op.firstName} ${op.lastName} (RFID: ${op.rfidCardId})`);
        } else {
            console.log(`ℹ️ Operator ${op.firstName} ${op.lastName} już istnieje`);
        }
    }

    console.log('🎉 Seedowanie zakończone!');
    await app.close();
}

bootstrap();