import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RequestContextGuard } from './request-context.guard';
import { PermissionsGuard } from './permissions.guard';
import { RequestContextInterceptor } from '../common/request-context.interceptor';
import { TenancyModule } from '../tenancy/tenancy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role]),
    PassportModule,
    // TenantResolverService jest potrzebny RequestContextGuard-owi.
    TenancyModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ||
            '8h') as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, RolesController],
  providers: [
    AuthService,
    RolesService,
    JwtStrategy,
    // Trzy guardy globalne, w tej kolejności — każdy zakłada, że poprzedni już
    // zadziałał:
    //   JwtAuthGuard       ustala KTO (req.user z podpisanego cookie),
    //   RequestContextGuard ustala CZYJE dane i CO wolno (tenant + uprawnienia),
    //   PermissionsGuard   porównuje to z @RequirePermission endpointu.
    // Kolejność w tej tablicy jest kolejnością wykonania — nie zmieniać bez
    // przemyślenia, bo PermissionsGuard bez kontekstu odrzuci każde żądanie.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RequestContextGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    // Przenosi kontekst przypięty przez guarda do AsyncLocalStorage, żeby
    // serwisy mogły wołać currentTenantId() bez przekazywania go w sygnaturach.
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
  ],
  exports: [AuthService, RolesService],
})
export class AuthModule {}
