import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../auth/public.decorator';

@ApiTags('Kondycja')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  // Proces żyje — do restart policy kontenera/orchestratora. Nie sprawdza zależności.
  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Liveness — proces działa' })
  live() {
    return { status: 'ok' };
  }

  // Gotowość do przyjmowania ruchu — sprawdza połączenie z bazą.
  // Do load balancera / orchestratora wykrywającego, kiedy instancja może obsłużyć ruch.
  @Get('ready')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness — baza danych dostępna' })
  ready() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
