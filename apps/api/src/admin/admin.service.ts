import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AutomationService } from '../jobs/automation/automation.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateUserDto } from './admin.dto.js';
import { buildUserUpdate } from './admin.rules.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly automation: AutomationService,
  ) {}

  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        canCollect: true,
        canSendEmail: true,
        credits: true,
        disabledAt: true,
        emailVerifiedAt: true,
        createdAt: true,
        _count: { select: { jobs: true, applications: true } },
      },
    });

    return users.map(({ _count, ...user }) => ({
      ...user,
      jobsCount: _count.jobs,
      applicationsCount: _count.applications,
    }));
  }

  private async findTarget(id: string) {
    const target = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true },
    });

    if (!target) {
      throw new NotFoundException('Utilisateur introuvable.');
    }

    return target;
  }

  async updateUser(id: string, actorId: string, dto: UpdateUserDto) {
    const target = await this.findTarget(id);
    const data = buildUserUpdate(target, actorId, dto);

    await this.prisma.user.update({ where: { id }, data });

    // Un compte désactivé est déconnecté immédiatement.
    if (dto.disabled === true) {
      await this.prisma.session.deleteMany({ where: { userId: id } });
    }

    return { ok: true };
  }

  async deleteUser(id: string, actorId: string) {
    const target = await this.findTarget(id);

    if (target.role === 'ADMIN' || target.id === actorId) {
      throw new ForbiddenException(
        'Le compte administrateur ne peut pas être supprimé.',
      );
    }

    // Profil, offres, CV, lettres, candidatures et sessions
    // sont supprimés en cascade.
    await this.prisma.user.delete({ where: { id } });

    return { ok: true };
  }

  async collectFor(id: string) {
    const target = await this.findTarget(id);

    return this.automation.runFranceTravail(target.id);
  }
}
