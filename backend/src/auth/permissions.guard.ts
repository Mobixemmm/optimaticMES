import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { contextFromRequest } from '../common/request-context';

// Zarejestrowany globalnie, po RequestContextGuard. Czyta uprawnienia wyliczone
// raz na żądanie z roli w bazie, zamiast porównywać nazwę roli.
//
// Źródłem jest kontekst przypięty do obiektu żądania, a nie AsyncLocalStorage:
// guardy wykonują się przed RequestContextInterceptor, który dopiero zakłada ALS.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const ctx = contextFromRequest(request);
    if (!ctx || !required.some((permission) => ctx.permissions.includes(permission))) {
      throw new ForbiddenException('Brak uprawnień do wykonania tej operacji');
    }
    return true;
  }
}
