import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';

type LeverJob = {
  id: string;
  text: string;

  descriptionPlain?: string;

  categories?: {
    location?: string;
    commitment?: string;
    team?: string;
    department?: string;
    allLocations?: string[];
  };

  hostedUrl?: string;
  applyUrl?: string;

  workplaceType?: string;

  salaryDescriptionPlain?: string;

  salaryRange?: {
    currency?: string;
    interval?: string;
    min?: number;
    max?: number;
  };

  [key: string]: unknown;
};

@Injectable()
export class LeverService {
  constructor(private readonly prisma: PrismaService) {}

  async importJobs(
    site: string,
    limit = 3,
    instance: 'global' | 'eu' = 'global',
  ) {
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const baseUrl =
      instance === 'eu'
        ? 'https://api.eu.lever.co'
        : 'https://api.lever.co';

    const url =
      `${baseUrl}/v0/postings/${encodeURIComponent(site)}` +
      `?mode=json&limit=${safeLimit}`;

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();

      throw new Error(
        `Erreur Lever : ${response.status} ${error}`,
      );
    }

    const offers = (await response.json()) as LeverJob[];

    const savedJobs = [];

    for (const offer of offers.slice(0, safeLimit)) {
      const salary =
        offer.salaryDescriptionPlain ??
        this.formatSalary(offer.salaryRange) ??
        null;

      const job = await this.prisma.job.upsert({
        where: {
          source_externalId: {
            userId: this.prisma.currentUserId,
            source: 'LEVER',
            externalId: offer.id,
          },
        },

        update: {
          title: offer.text,

          company: site,

          description:
            offer.descriptionPlain ?? null,

          location:
            offer.categories?.location ?? null,

          department:
            offer.categories?.department ?? null,

          contractType:
            offer.categories?.commitment ?? null,

          salary,

          url:
            offer.hostedUrl ??
            offer.applyUrl ??
            null,

          raw: offer as Prisma.InputJsonValue,
        },

        create: {
          source: 'LEVER',
          externalId: offer.id,

          title: offer.text,

          company: site,

          description:
            offer.descriptionPlain ?? null,

          location:
            offer.categories?.location ?? null,

          department:
            offer.categories?.department ?? null,

          contractType:
            offer.categories?.commitment ?? null,

          experience: null,

          salary,

          url:
            offer.hostedUrl ??
            offer.applyUrl ??
            null,

          sourceCreatedAt: null,
          sourceUpdatedAt: null,

          raw: offer as Prisma.InputJsonValue,
        },
      });

      savedJobs.push(job);
    }

    return {
      source: 'LEVER',
      site,
      instance,
      imported: savedJobs.length,
      jobs: savedJobs,
    };
  }

  private formatSalary(
    salaryRange?: LeverJob['salaryRange'],
  ): string | null {
    if (!salaryRange) {
      return null;
    }

    const {
      currency,
      interval,
      min,
      max,
    } = salaryRange;

    if (min == null && max == null) {
      return null;
    }

    return [
      min,
      max != null ? `- ${max}` : null,
      currency,
      interval ? `/ ${interval}` : null,
    ]
      .filter(Boolean)
      .join(' ');
  }
}