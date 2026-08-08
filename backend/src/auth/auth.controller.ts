import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Res,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { RequirePermission } from './permissions.decorator';
import { PERMISSIONS } from './permissions.constants';
import { Public } from './public.decorator';

const COOKIE_NAME = 'mes_token';
const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8h

@ApiTags('Autoryzacja')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private cookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: this.configService.get('COOKIE_SECURE') === 'true',
      maxAge: COOKIE_MAX_AGE_MS,
      path: '/',
    };
  }

  @Post('login')
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Zaloguj się (ustawia httpOnly cookie z JWT)' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(dto.email, dto.password);
    const token = this.authService.issueToken(user);
    res.cookie(COOKIE_NAME, token, this.cookieOptions());
    return this.authService.toPublicUser(user);
  }

  @Post('logout')
  @Public()
  @ApiOperation({ summary: 'Wyloguj się (czyści cookie)' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return { success: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'Pobierz bieżącego zalogowanego użytkownika' })
  async me(@Req() req: Request) {
    const payload = req.user as { id: number };
    const user = await this.authService.findById(payload.id);
    return user ? this.authService.toPublicUser(user) : null;
  }

  @Get('users')
  @RequirePermission(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'Lista użytkowników' })
  async listUsers() {
    const users = await this.authService.listUsers();
    return users.map((u) => this.authService.toPublicUser(u));
  }

  @Post('users')
  @RequirePermission(PERMISSIONS.USERS_WRITE)
  @ApiOperation({ summary: 'Utwórz użytkownika (admin)' })
  async createUser(@Body() dto: CreateUserDto) {
    const user = await this.authService.createUser(dto);
    return this.authService.toPublicUser(user);
  }

  @Patch('users/:id/role')
  @RequirePermission(PERMISSIONS.USERS_WRITE)
  @ApiOperation({ summary: 'Zmień rolę użytkownika (admin)' })
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
  ) {
    const user = await this.authService.updateRole(id, dto.role);
    return this.authService.toPublicUser(user);
  }

  @Delete('users/:id')
  @RequirePermission(PERMISSIONS.USERS_WRITE)
  @ApiOperation({ summary: 'Usuń użytkownika (admin)' })
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    await this.authService.deleteUser(id);
    return { success: true };
  }
}
