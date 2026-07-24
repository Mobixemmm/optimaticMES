import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OperatorsService } from './operators.service';
import { LoginRfidDto } from './dto/login-rfid.dto';

@ApiTags('Operatorzy RFID')
@Controller('operators')
export class OperatorsController {
    constructor(private readonly operatorsService: OperatorsService) {}

    @Post('login-rfid')
    @ApiOperation({ summary: 'Zaloguj przez RFID (przybij kartę)' })
    async loginWithRfid(@Body() dto: LoginRfidDto) {
        return this.operatorsService.loginWithRfid(dto.rfidCardId);
    }

    @Post('logout/:sessionId')
    @ApiOperation({ summary: 'Wyloguj operatora' })
    async logout(@Param('sessionId') sessionId: number) {
        return this.operatorsService.logout(sessionId);
    }

    @Get('session/:rfidCardId')
    @ApiOperation({ summary: 'Sprawdź aktywną sesję' })
    async getActiveSession(@Param('rfidCardId') rfidCardId: string) {
        return this.operatorsService.getActiveSession(rfidCardId);
    }

    @Get()
    @ApiOperation({ summary: 'Lista operatorów' })
    async findAll() {
        return this.operatorsService.findAll();
    }

    @Post()
    @ApiOperation({ summary: 'Dodaj operatora (admin)' })
    async create(@Body() data: any) {
        return this.operatorsService.create(data);
    }
}