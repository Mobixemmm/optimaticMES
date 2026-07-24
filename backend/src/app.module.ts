import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionOrder } from './entities/production-order.entity';
import { SensorData } from './entities/sensor-data.entity';
import { OrdersModule } from './orders/orders.module';
import { SensorsModule } from './sensors/sensors.module';

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
        entities: [ProductionOrder, SensorData],
        synchronize: true,
        logging: false, // wyłączamy logi SQL żeby nie zaśmiecały konsoli
      }),
      inject: [ConfigService],
    }),
    OrdersModule,
    SensorsModule,
  ],
})
export class AppModule {}