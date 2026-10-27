import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';

/** Réserve une route à l'administrateur (rôle ADMIN). */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    if (request.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Accès réservé à l\'administrateur.');
    }

    return true;
  }
}
