import { Injectable } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { AsyncLocalStorage } from 'node:async_hooks';
import { PrismaClient } from '../generated/prisma/client.js';
import { isScopedModel, scopeArgs } from './scope.js';

export type UserContext = {
  userId: string;
  email: string;
  role?: string;
  canCollect?: boolean;
  canSendEmail?: boolean;
};

/**
 * Utilisateur de la requête en cours. Renseigné par l'intercepteur
 * d'authentification, lu par PrismaService pour filtrer les données.
 */
export const userContext = new AsyncLocalStorage<UserContext>();

const DELEGATES = new Set([
  'candidateProfile',
  'experience',
  'education',
  'skill',
  'project',
  'job',
  'jobAnalysis',
  'resume',
  'coverLetter',
  'application',
]);

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined');
    }

    const adapter = new PrismaPg({
      connectionString,
    });

    super({ adapter });

    // Client dont chaque requête sur les données métier est limitée
    // à l'utilisateur courant. Sans utilisateur, la requête échoue.
    const scoped = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (!isScopedModel(model)) {
              return query(args);
            }

            const store = userContext.getStore();

            if (!store) {
              throw new Error(
                `Accès à ${model} sans utilisateur authentifié.`,
              );
            }

            return query(scopeArgs(model, operation, args, store.userId));
          },
        },
      },
    });

    // Les delegates métier passent par le client filtré ; le reste
    // (User, Session, $connect, ...) reste sur le client de base.
    return new Proxy(this, {
      get(target, prop) {
        if (typeof prop === 'string') {
          if (DELEGATES.has(prop)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (scoped as any)[prop];
          }

          if (prop === '$transaction') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (scoped as any).$transaction.bind(scoped);
          }
        }

        const value = Reflect.get(target, prop, target);

        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
  }

  /** Identifiant de l'utilisateur de la requête en cours. */
  get currentUserId(): string {
    const store = userContext.getStore();

    if (!store) {
      throw new Error('Aucun utilisateur authentifié dans ce contexte.');
    }

    return store.userId;
  }
}
