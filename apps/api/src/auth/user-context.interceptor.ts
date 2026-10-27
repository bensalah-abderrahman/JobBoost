import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { userContext } from '../prisma/prisma.service.js';
import type { AuthenticatedRequest } from './auth.guard.js';

/**
 * Place l'utilisateur authentifié dans un contexte asynchrone pour que
 * PrismaService filtre automatiquement toutes les données dessus.
 */
@Injectable()
export class UserContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      return next.handle();
    }

    const { id, email, role, canCollect, canSendEmail } = request.user;
    const store = { userId: id, email, role, canCollect, canSendEmail };

    return new Observable((subscriber) =>
      userContext.run(store, () => next.handle().subscribe(subscriber)),
    );
  }
}
