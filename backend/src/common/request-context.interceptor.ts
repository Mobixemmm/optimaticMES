import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContextStore, contextFromRequest } from './request-context';

// Zakłada AsyncLocalStorage na czas wykonania handlera.
//
// Dlaczego interceptor, a nie guard: AsyncLocalStorage.enterWith() wywołane
// wewnątrz asynchronicznego canActivate() ustawia store na kontekście async
// GUARDA. Gdy Nest wraca z `await guard.canActivate(...)`, wznawia się we
// własnym kontekście — utworzonym zanim enterWith() się wykonało — i store jest
// tam niewidoczny. Interceptor omija to, bo handler odpala się dopiero przy
// subskrypcji, którą wywołujemy JAWNIE wewnątrz storage.run().
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Record<string, unknown>>();
    const requestContext = contextFromRequest(request);

    // Trasy publiczne, dla których nie dało się ustalić klienta (health-check),
    // idą dalej bez kontekstu — serwis, który go potrzebuje, i tak rzuci jasnym
    // błędem zamiast po cichu wziąć cudzego tenanta.
    if (!requestContext) {
      return next.handle();
    }

    return new Observable((subscriber) => {
      RequestContextStore.run(requestContext, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
