import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  // Tenant w podpisanym tokenie: nie da się go podmienić nagłówkiem, więc
  // zalogowany użytkownik nie zajrzy do danych innego klienta.
  tenantId: number;
}

function cookieExtractor(req: Request): string | null {
  const cookies = req?.cookies as Record<string, string> | undefined;
  return cookies?.['mes_token'] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
    };
  }
}
