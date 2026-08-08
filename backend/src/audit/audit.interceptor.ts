import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { sanitizeBody } from './sanitize-body';
import { contextFromRequest } from '../common/request-context';

const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

interface AuthenticatedUser {
  id: number;
  email: string;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    if (!AUDITED_METHODS.has(req.method)) {
      return next.handle();
    }

    const res = context.switchToHttp().getResponse<Response>();
    const sanitizedBody = sanitizeBody(req.body);

    return next.handle().pipe(
      tap({
        next: (responseBody) => this.write(req, res.statusCode, sanitizedBody, responseBody),
        error: (err: { status?: number }) =>
          this.write(req, err.status ?? 500, sanitizedBody, undefined),
      }),
    );
  }

  private write(
    req: Request,
    statusCode: number,
    body: Record<string, unknown> | null,
    responseBody: unknown,
  ): void {
    const user = req.user as AuthenticatedUser | undefined;
    // Z obiektu żądania, a nie z ALS — zapis leci "fire-and-forget", więc nie
    // zakładamy, że kontekst async wciąż żyje w chwili faktycznego INSERT-a.
    const context = contextFromRequest(req as unknown as Record<string, unknown>);
    // Bez ustalonego tenanta nie ma czego audytować w rozbiciu na klientów —
    // dotyczy to wyłącznie tras publicznych, które nie ruszają danych domenowych.
    if (!context) {
      return;
    }
    // /auth/login nie ma jeszcze req.user (guard przepuszcza jako @Public) —
    // przy sukcesie backend zwraca zalogowanego usera, więc bierzemy e-mail stamtąd.
    const loginResponseEmail =
      req.path === '/auth/login' &&
      responseBody &&
      typeof responseBody === 'object' &&
      'email' in responseBody
        ? String((responseBody as { email: unknown }).email)
        : null;

    void this.auditService.record({
      tenantId: context.tenantId,
      userId: user?.id ?? null,
      userEmail: user?.email ?? loginResponseEmail,
      method: req.method,
      path: req.originalUrl,
      statusCode,
      body,
      ip: req.ip ?? null,
    });
  }
}
