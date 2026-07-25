import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionOrder } from './entities/production-order.entity';
import { SensorData } from './entities/sensor-data.entity';
import { Operator } from './entities/operator.entity';
import { OperatorSession } from './entities/operator-session.entity';
import { MachineData } from './entities/machine-data.entity';
import { OrdersModule } from './orders/orders.module';
import { SensorsModule } from './sensors/sensors.module';
import { OperatorsModule } from './operators/operators.module';
import { MachineDataModule } from './machine-data/machine-data.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: parseInt(configService.get('DATABASE_PORT')!, 10),
        username: configService.get('DATABASE_USERNAME'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        entities: [ProductionOrder, SensorData, Operator, OperatorSession, MachineData],
        synchronize: false, // WAŻNE: nie modyfikujemy istniejącej tabeli TimescaleDB
        logging: false,
      }),
      inject: [ConfigService],
    }),
    OrdersModule,
    SensorsModule,
    OperatorsModule,
    MachineDataModule,
  ],
})
export class AppModule {}