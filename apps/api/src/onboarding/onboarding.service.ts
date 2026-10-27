import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export type OnboardingStep = {
  id: 'profile' | 'offers' | 'application' | 'follow-up';
  label: string;
  hint: string;
  href: string;
  done: boolean;
};

const SENT_STATUSES = [
  'SENT',
  'RESPONSE_RECEIVED',
  'INTERVIEW',
  'REJECTED',
  'FOLLOW_UP',
] as const;

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getProgress() {
    const [profile, jobs, applications, sent] = await Promise.all([
      this.prisma.candidateProfile.findFirst({
        include: {
          _count: { select: { skills: true, experiences: true } },
        },
      }),
      this.prisma.job.count(),
      this.prisma.application.count(),
      this.prisma.application.count({
        where: { status: { in: [...SENT_STATUSES] } },
      }),
    ]);

    // Ce qu'il manque au profil, dit en clair.
    const missing: string[] = [];

    if (!profile?.targetRoles?.length) missing.push('un métier visé');
    if ((profile?._count.skills ?? 0) < 3) missing.push('3 compétences');
    if ((profile?._count.experiences ?? 0) < 1) missing.push('une expérience');

    const steps: OnboardingStep[] = [
      {
        id: 'profile',
        label: 'Compléter mon profil',
        hint: missing.length
          ? `Il manque : ${missing.join(', ')}.`
          : 'Votre profil est prêt.',
        href: '/profile',
        done: missing.length === 0,
      },
      {
        id: 'offers',
        label: 'Trouver des offres',
        hint: 'Importez des offres et laissez l’IA les noter.',
        href: '/jobs',
        done: jobs > 0,
      },
      {
        id: 'application',
        label: 'Préparer ma première candidature',
        hint: 'CV et lettre sont générés pour vous, à valider.',
        href: '/jobs',
        done: applications > 0,
      },
      {
        id: 'follow-up',
        label: 'Envoyer et suivre',
        hint: 'Validez, envoyez, puis suivez les réponses.',
        href: '/applications',
        done: sent > 0,
      },
    ];

    const doneCount = steps.filter((step) => step.done).length;
    const next = steps.find((step) => !step.done) ?? null;

    return {
      steps,
      percent: Math.round((doneCount / steps.length) * 100),
      complete: doneCount === steps.length,
      next: next?.id ?? null,
    };
  }
}
