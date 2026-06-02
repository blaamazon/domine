import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

export interface ResponseEnvelope<T> {
  data: T;
  meta: {
    request_id: string;
    timestamp: string;
  };
  errors: null | any[];
}

@Injectable()
export class ResponseEnvelopeInterceptor<T>
  implements NestInterceptor<T, ResponseEnvelope<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseEnvelope<T>> {
    const requestId = uuidv4();
    const timestamp = new Date().toISOString();

    return next.handle().pipe(
      map((data) => ({
        data,
        meta: {
          request_id: requestId,
          timestamp,
        },
        errors: null,
      })),
    );
  }
}