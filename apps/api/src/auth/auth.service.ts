import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { hashPassword, verifyPassword } from './password.util.js';

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  canCollect: boolean;
  canSendEmail: boolean;
  credits: number;
};

type UserRow = {
  id: string;
  email: string;
  role: string;
  canCollect: boolean;
  canSendEmail: boolean;
  credits: number;
};

function toAuthUser(user: UserRow): AuthUser {
  const admin = user.role === 'ADMIN';

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    // L'administrateur dispose de toutes les autorisations.
    canCollect: admin || user.canCollect,
    canSendEmail: admin || user.canSendEmail,
    credits: user.credits,
  };
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 12;
// Comptes créés via un fournisseur : aucun mot de passe utilisable.
const UNUSABLE_PASSWORD = 'oauth$disabled';
const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_SIGNUPS_PER_HOUR = 5;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  private readonly failedAttempts = new Map<
    string,
    { count: number; resetAt: number }
  >();

  private dummyHash: Promise<string> | null = null;

  private readonly signups = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  // ============================================================
  // PREMIER COMPTE
  // ============================================================

  async onModuleInit() {
    try {
      await this.createFirstUserIfNeeded();
    } catch (error) {
      this.logger.error(
        'Impossible de vérifier les comptes. La migration "add_auth" est-elle appliquée ?',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async createFirstUserIfNeeded() {
    if ((await this.prisma.user.count()) > 0) {
      await this.ensureOwnerIsAdmin();
      return;
    }

    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      this.logger.warn(
        'Aucun compte existant. Définissez ADMIN_EMAIL et ADMIN_PASSWORD pour créer le premier compte.',
      );
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      this.logger.error(
        `ADMIN_PASSWORD doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères. Compte non créé.`,
      );
      return;
    }

    await this.prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        emailVerifiedAt: new Date(),
        role: 'ADMIN',
      },
    });

    this.logger.log(`Premier compte créé : ${email}`);
  }

  // Le compte ADMIN_EMAIL est toujours administrateur.
  private async ensureOwnerIsAdmin() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();

    if (!email) {
      return;
    }

    await this.prisma.user.updateMany({
      where: { email, role: { not: 'ADMIN' } },
      data: { role: 'ADMIN' },
    });
  }

  // ============================================================
  // CONNEXION
  // ============================================================

  async login(email: string, password: string, ip: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const key = `${ip}|${normalizedEmail}`;

    this.assertNotRateLimited(key);

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Même durée de calcul si le compte n'existe pas,
    // pour ne pas révéler quelles adresses sont enregistrées.
    const hash = user ? user.passwordHash : await this.getDummyHash();
    const valid = await verifyPassword(password, hash);

    if (!user || !valid) {
      this.registerFailure(key);

      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException(
        "Adresse email non confirmée. Ouvrez le lien reçu par email ou demandez-en un nouveau.",
      );
    }

    if (user.disabledAt) {
      throw new ForbiddenException(
        "Ce compte est désactivé. Contactez l'administrateur.",
      );
    }

    this.failedAttempts.delete(key);

    const { token, expiresAt } = await this.createSession(user.id);

    return {
      token,
      expiresAt,
      user: toAuthUser(user),
    };
  }

  async createSession(userId: string) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt,
      },
    });

    // Nettoyage des sessions expirées, sans bloquer la réponse.
    void this.prisma.session
      .deleteMany({ where: { expiresAt: { lt: new Date() } } })
      .catch(() => undefined);

    return { token, expiresAt };
  }

  // ============================================================
  // CONNEXION VIA UN FOURNISSEUR (Google, GitHub, ...)
  // ============================================================

  /**
   * L'email fourni par le fournisseur est déjà vérifié par lui.
   * Compte existant : on s'y connecte. Sinon : on le crée avec un
   * profil rempli à partir du nom du fournisseur.
   */
  async signInWithProvider(profile: {
    email: string;
    firstName: string;
    lastName: string;
  }) {
    const email = profile.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    if (existing?.disabledAt) {
      throw new ForbiddenException(
        "Ce compte est désactivé. Contactez l'administrateur.",
      );
    }

    if (existing) {
      // Un compte créé par mot de passe mais jamais confirmé pourrait
      // appartenir à quelqu'un d'autre : on invalide son mot de passe.
      if (!existing.emailVerifiedAt) {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            passwordHash: UNUSABLE_PASSWORD,
            emailVerifiedAt: new Date(),
            verifyTokenHash: null,
            verifyTokenExpires: null,
          },
        });
      }

      return this.createSession(existing.id);
    }

    const firstName = profile.firstName.trim() || email.split('@')[0];
    const lastName = profile.lastName.trim();

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: UNUSABLE_PASSWORD,
        firstName,
        lastName,
        emailVerifiedAt: new Date(),
        profile: {
          create: { firstName, lastName, email },
        },
      },
    });

    return this.createSession(user.id);
  }

  // ============================================================
  // INSCRIPTION
  // ============================================================

  async register(
    input: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    },
    ip: string,
  ) {
    this.assertSignupAllowed(ip);

    if (input.password.length < MIN_PASSWORD_LENGTH) {
      throw new BadRequestException(
        `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
      );
    }

    const email = input.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });

    // Réponse identique que l'adresse existe ou non : on ne révèle
    // pas quels emails ont un compte.
    if (existing) {
      if (!existing.emailVerifiedAt) {
        await this.sendVerification(existing.id, existing.email, existing.firstName ?? '');
      }

      return;
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(input.password),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        profile: {
          create: {
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            email,
          },
        },
      },
    });

    await this.sendVerification(user.id, user.email, input.firstName.trim());
  }

  async resendVerification(emailInput: string, ip: string) {
    this.assertSignupAllowed(ip);

    const user = await this.prisma.user.findUnique({
      where: { email: emailInput.trim().toLowerCase() },
    });

    if (user && !user.emailVerifiedAt) {
      await this.sendVerification(user.id, user.email, user.firstName ?? '');
    }
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findUnique({
      where: { verifyTokenHash: hashToken(token) },
    });

    if (
      !user ||
      !user.verifyTokenExpires ||
      user.verifyTokenExpires.getTime() <= Date.now()
    ) {
      throw new ForbiddenException(
        'Lien invalide ou expiré. Demandez un nouveau lien de confirmation.',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        verifyTokenHash: null,
        verifyTokenExpires: null,
      },
    });
  }

  private async sendVerification(
    userId: string,
    email: string,
    firstName: string,
  ) {
    const token = randomBytes(32).toString('base64url');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        verifyTokenHash: hashToken(token),
        verifyTokenExpires: new Date(Date.now() + VERIFY_TTL_MS),
      },
    });

    const appUrl = (process.env.APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

    try {
      await this.mail.sendVerificationEmail(
        email,
        firstName || 'et bienvenue',
        `${appUrl}/verify?token=${encodeURIComponent(token)}`,
      );
    } catch (error) {
      this.logger.error(
        `Envoi de l'email de vérification impossible : ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private assertSignupAllowed(ip: string) {
    const now = Date.now();
    const entry = this.signups.get(ip);

    if (!entry || entry.resetAt <= now) {
      this.signups.set(ip, { count: 1, resetAt: now + SIGNUP_WINDOW_MS });
      return;
    }

    if (entry.count >= MAX_SIGNUPS_PER_HOUR) {
      throw new HttpException(
        'Trop de demandes depuis cette adresse. Réessayez plus tard.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count += 1;
  }

  // ============================================================
  // UTILISATEUR INTERNE (n8n, appels de l'API vers elle-même)
  // ============================================================

  async resolveInternalUser(userId?: string): Promise<AuthUser | null> {
    const user = userId
      ? await this.prisma.user.findUnique({ where: { id: userId } })
      : await this.findOwner();

    return user && !user.disabledAt ? toAuthUser(user) : null;
  }

  private async findOwner() {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();

    if (email) {
      const byEmail = await this.prisma.user.findUnique({ where: { email } });

      if (byEmail) {
        return byEmail;
      }
    }

    return this.prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  }

  // ============================================================
  // SESSION
  // ============================================================

  async validate(token: string): Promise<AuthUser | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });

    if (
      !session ||
      session.expiresAt.getTime() <= Date.now() ||
      session.user.disabledAt
    ) {
      return null;
    }

    return toAuthUser(session.user);
  }

  async logout(token: string) {
    await this.prisma.session.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }

  // ============================================================
  // LIMITE DE TENTATIVES
  // ============================================================

  private assertNotRateLimited(key: string) {
    const entry = this.failedAttempts.get(key);

    if (!entry) {
      return;
    }

    if (entry.resetAt <= Date.now()) {
      this.failedAttempts.delete(key);
      return;
    }

    if (entry.count >= MAX_FAILED_ATTEMPTS) {
      throw new HttpException(
        'Trop de tentatives. Réessayez dans quelques minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private registerFailure(key: string) {
    const now = Date.now();

    if (this.failedAttempts.size > 1000) {
      for (const [storedKey, entry] of this.failedAttempts) {
        if (entry.resetAt <= now) {
          this.failedAttempts.delete(storedKey);
        }
      }
    }

    const entry = this.failedAttempts.get(key);

    if (!entry || entry.resetAt <= now) {
      this.failedAttempts.set(key, {
        count: 1,
        resetAt: now + ATTEMPT_WINDOW_MS,
      });
      return;
    }

    entry.count += 1;
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= hashPassword(randomBytes(16).toString('hex'));

    return this.dummyHash;
  }
}
