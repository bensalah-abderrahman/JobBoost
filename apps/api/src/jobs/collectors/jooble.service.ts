import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';

type JoobleJob = {
  id?: number | string;
  title?: string;
  location?: string;
  snippet?: string;
  salary?: string;
  source?: string;
  type?: string;
  link?: string;
  company?: string;
  updated?: string;
};

type JoobleResponse = {
  totalCount?: number;
  jobs?: JoobleJob[];
};

@Injectable()
export class JoobleService {
  constructor(private readonly prisma: PrismaService) {}

  async importJobs(
    keyword = 'developpeur full stack',
    location = 'Ile-de-France',
    limit = 3,
  ) {
    const apiKey = process.env.JOOBLE_API_KEY;

    if (!apiKey) {
      throw new Error('JOOBLE_API_KEY manquant dans apps/api/.env');
    }

    const safeLimit = Math.min(Math.max(limit, 1), 20);

    const response = await fetch(
      `https://fr.jooble.org/api/${apiKey}`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },

        body: JSON.stringify({
          keywords: keyword,
          location,
          page: 1,
          ResultOnPage: safeLimit,
          companysearch: false,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();

      throw new Error(
        `Erreur Jooble : ${response.status} ${error}`,
      );
    }

    const data = (await response.json()) as JoobleResponse;

    const offers = data.jobs ?? [];

    const savedJobs = [];

    for (const offer of offers) {
      if (!offer.title || !offer.link) {
        continue;
      }

      const externalId =
        offer.id?.toString() ??
        offer.link;

      const job = await this.prisma.job.upsert({
        where: {
          source_externalId: {
            userId: this.prisma.currentUserId,
            source: 'JOOBLE',
            externalId,
          },
        },

        update: {
          title: offer.title,
          company: offer.company ?? null,
          description: offer.snippet ?? null,
          location: offer.location ?? null,
          contractType: offer.type ?? null,
          salary: offer.salary ?? null,
          url: offer.link,

          sourceCreatedAt: offer.updated
            ? new Date(offer.updated)
            : null,

          raw: offer as Prisma.InputJsonValue,
        },

        create: {
          source: 'JOOBLE',
          externalId,

          title: offer.title,
          company: offer.company ?? null,
          description: offer.snippet ?? null,
          location: offer.location ?? null,

          department: null,
          contractType: offer.type ?? null,
          experience: null,
          salary: offer.salary ?? null,

          url: offer.link,

          sourceCreatedAt: offer.updated
            ? new Date(offer.updated)
            : null,

          sourceUpdatedAt: null,

          raw: offer as Prisma.InputJsonValue,
        },
      });

      savedJobs.push(job);
    }

    return {
      source: 'JOOBLE',
      keyword,
      location,
      imported: savedJobs.length,
      jobs: savedJobs,
    };
  }
}