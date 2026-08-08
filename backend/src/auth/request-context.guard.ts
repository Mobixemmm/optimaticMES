import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { attachContextToRequest } from '../common/request-context';
import { TenantResolverService } from '../tenancy/tenant-resolver.service';
import { RolesService } from './roles.service';
import { IS_PUBLIC_KEY } from './public.decorator';

interface AuthenticatedUser {
  id: number;
  email: string;
  role: string;
  tenantId?: number;
}

// Ustala kontekst żądania (tenant + uprawnienia) i przypina go do obiektu
// żądania. Samo założenie AsyncLocalStorage robi dopiero
// RequestContextInterceptor — powód w komentarzu przy tym interceptorze.
//
// Kolejność w AuthModule jest istotna: JwtAuthGuard → RequestContextGuard →
// PermissionsGuard. Pierwszy ustala KTO pyta, drugi CZYJE dane i CO wolno,
// trzeci porównuje to z wymaganiem endpointu.
@Injectable()
export class RequestContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantResolver: TenantResolverService,
    private readonly rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;
    const headerSlug = request.headers['x-tenant'];

    let tenantId: number;
    try {
      tenantId = await this.tenantResolver.resolve({
        userTenantId: user?.tenantId ?? null,
        tenantSlugHeader: typeof headerSlug === 'string' ? headerSlug : null,
      });
    } catch (error) {
      // Trasy bez sesji, które nie dotykają danych klienta (health-check),
      // muszą działać także wtedy, gdy tenanta nie da się ustalić. Zostawiamy
      // je BEZ kontekstu — jeśli taki endpoint mimo wszystko sięgnie po dane
      // domenowe, currentTenantId() rzuci jasnym błędem zamiast zgadywać.
      const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (isPublic) {
        return true;
      }
      throw error;
    }

    const requestRecord = request as unknown as Record<string, unknown>;

    if (!user) {
      attachContextToRequest(requestRecord, {
        tenantId,
        userId: null,
        roleCode: null,
        permissions: [],
        siteScope: [],
      });
      return true;
    }

    const { permissions, siteScope } = await this.rolesService.resolve(tenantId, user.role);
    attachContextToRequest(requestRecord, {
      tenantId,
      userId: user.id,
      roleCode: user.role,
      permissions,
      siteScope,
    });
    return true;
  }
}
