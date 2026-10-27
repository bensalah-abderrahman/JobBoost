import { ForbiddenException } from '@nestjs/common';
import { userContext } from '../prisma/prisma.service.js';

export type Permission = 'canCollect' | 'canSendEmail';

export function isAdmin(): boolean {
  return userContext.getStore()?.role === 'ADMIN';
}

/**
 * Lève une 403 si l'utilisateur courant n'a pas l'autorisation.
 * L'administrateur passe toujours.
 */
export function requirePermission(permission: Permission, message: string) {
  const store = userContext.getStore();

  if (store?.role === 'ADMIN' || store?.[permission] === true) {
    return;
  }

  throw new ForbiddenException(message);
}
