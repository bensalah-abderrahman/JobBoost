import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import type { AuthUser } from './auth.service.js';
import { SESSION_COOKIE, readCookie } from './cookie.util.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
};

function digest(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/**
 * Garde global : toute route exige soit une session valide (cookie),
 * soit la clé interne (n8n et appels de l'API vers elle-même),
 * sauf les routes marquées @Public().
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    if (this.hasValidInternalKey(request)) {
      // n8n et les appels internes agissent pour un utilisateur précis
      // (x-user-id) ou, à défaut, pour le propriétaire de l'instance.
      const header = request.headers['x-user-id'];
      const user = await this.authService.resolveInternalUser(
        typeof header === 'string' && header ? header : undefined,
      );

      if (!user) {
        throw new UnauthorizedException('Utilisateur interne introuvable.');
      }

      request.user = user;
      return true;
    }

    const token = readCookie(request.headers.cookie, SESSION_COOKIE);

    if (token) {
      const user = await this.authService.validate(token);

      if (user) {
        request.user = user;
        return true;
      }
    }

    throw new UnauthorizedException('Authentification requise.');
  }

  private hasValidInternalKey(request: Request): boolean {
    const expected = process.env.INTERNAL_API_KEY;

    // Une clé trop courte est considérée comme non configurée.
    if (!expected || expected.length < 16) {
      return false;
    }

    const provided = request.headers['x-internal-key'];

    if (typeof provided !== 'string' || provided.length === 0) {
      return false;
    }

    return timingSafeEqual(digest(provided), digest(expected));
  }
}
