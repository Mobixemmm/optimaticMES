import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OperatorsService, toPublicOperator } from './operators.service';
import { LoginRfidDto } from './dto/login-rfid.dto';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { Public } from '../auth/public.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { RequirePermission } from '../auth/permissions.decorator';
import { PERMISSIONS } from '../auth/permissions.constants';

@ApiTags('Operatorzy RFID')
@Controller('operators')
export class OperatorsController {
  constructor(private readonly operatorsService: OperatorsService) {}

  // Terminal na hali nie ma sesji przeglądarkowej — czynnikiem uwierzytelniającym
  // jest fizyczna karta RFID + PIN (patrz OperatorsService.loginWithRfid).
  @Post('login-rfid')
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Zaloguj przez RFID (przybij kartę + PIN)' })
  async loginWithRfid(@Body() dto: LoginRfidDto) {
    const { operator, session } = await this.operatorsService.loginWithRfid(
      dto.rfidCardId,
      dto.pin,
    );
    return { operator: toPublicOperator(operator), session };
  }

  @Post('logout/:sessionId')
  @Public()
  @ApiOperation({ summary: 'Wyloguj operatora' })
  async logout(@Param('sessionId', ParseIntPipe) sessionId: number) {
    return this.operatorsService.logout(sessionId);
  }

  @Get('session/:rfidCardId')
  @Public()
  @ApiOperation({ summary: 'Sprawdź aktywną sesję' })
  async getActiveSession(@Param('rfidCardId') rfidCardId: string) {
    const session = await this.operatorsService.getActiveSession(rfidCardId);
    if (!session) return null;
    return {
      ...session,
      operator: session.operator ? toPublicOperator(session.operator) : session.operator,
    };
  }

  @Get()
  @RequirePermission(PERMISSIONS.OPERATORS_READ)
  @ApiOperation({ summary: 'Lista operatorów (stronicowana)' })
  async findAll(@Query() pagination: PaginationQueryDto) {
    const result = await this.operatorsService.findAll(pagination);
    return { ...result, data: result.data.map(toPublicOperator) };
  }

  @Post()
  @RequirePermission(PERMISSIONS.OPERATORS_WRITE)
  @ApiOperation({ summary: 'Dodaj operatora (admin)' })
  async create(@Body() data: CreateOperatorDto) {
    return toPublicOperator(await this.operatorsService.create(data));
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.OPERATORS_READ)
  @ApiOperation({ summary: 'Pobierz operatora po ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return toPublicOperator(await this.operatorsService.findOne(id));
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.OPERATORS_WRITE)
  @ApiOperation({ summary: 'Edytuj operatora (admin)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateOperatorDto,
  ) {
    return toPublicOperator(await this.operatorsService.update(id, data));
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.OPERATORS_WRITE)
  @ApiOperation({ summary: 'Usuń operatora (admin)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.operatorsService.remove(id);
    return { success: true };
  }
}
