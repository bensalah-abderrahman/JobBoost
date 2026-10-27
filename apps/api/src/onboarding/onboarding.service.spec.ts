import { describe, expect, it, vi } from 'vitest';

// Le vrai PrismaService a besoin du client généré et d'une base.
vi.mock('../prisma/prisma.service.js', () => ({ PrismaService: class {} }));

import { OnboardingService } from './onboarding.service.js';

function serviceWith(data: {
  profile?: {
    targetRoles: string[];
    _count: { skills: number; experiences: number };
  } | null;
  jobs?: number;
  applications?: number;
  sent?: number;
}) {
  const prisma = {
    candidateProfile: { findFirst: async () => data.profile ?? null },
    job: { count: async () => data.jobs ?? 0 },
    application: {
      count: async (args?: unknown) => (args ? (data.sent ?? 0) : (data.applications ?? 0)),
    },
  };

  return new OnboardingService(prisma as never);
}

describe('OnboardingService', () => {
  it('nouveau compte : tout reste à faire, le profil est la prochaine étape', async () => {
    const result = await serviceWith({
      profile: { targetRoles: [], _count: { skills: 0, experiences: 0 } },
    }).getProgress();

    expect(result.percent).toBe(0);
    expect(result.next).toBe('profile');
    expect(result.complete).toBe(false);
    expect(result.steps[0].hint).toContain('un métier visé');
    expect(result.steps[0].hint).toContain('3 compétences');
  });

  it('profil prêt : la prochaine étape devient les offres', async () => {
    const result = await serviceWith({
      profile: { targetRoles: ['Développeur'], _count: { skills: 4, experiences: 1 } },
    }).getProgress();

    expect(result.steps[0].done).toBe(true);
    expect(result.next).toBe('offers');
    expect(result.percent).toBe(25);
  });

  it('parcours complet', async () => {
    const result = await serviceWith({
      profile: { targetRoles: ['Dev'], _count: { skills: 5, experiences: 2 } },
      jobs: 12,
      applications: 3,
      sent: 1,
    }).getProgress();

    expect(result.complete).toBe(true);
    expect(result.percent).toBe(100);
    expect(result.next).toBeNull();
  });

  it("sans profil du tout, ne plante pas", async () => {
    const result = await serviceWith({ profile: null }).getProgress();

    expect(result.next).toBe('profile');
  });
});
