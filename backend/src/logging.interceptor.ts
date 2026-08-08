import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<Request>();
    const res = httpContext.getResponse<Response>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.log(req, res.statusCode, start),
        error: (err: { status?: number }) =>
          this.log(req, err.status ?? 500, start),
      }),
    );
  }

  private log(req: Request, statusCode: number, start: number): void {
    const durationMs = Date.now() - start;
    this.logger.log(`${req.method} ${req.originalUrl} ${statusCode} ${durationMs}ms`);
  }
}
