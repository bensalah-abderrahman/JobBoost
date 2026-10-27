import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';

type SerperResult = {
  position?: number;
  title?: string;
  link?: string;
  snippet?: string;
  date?: string;
};

type SerperResponse = {
  organic?: SerperResult[];
};

@Injectable()
export class WebSearchCollectorService {
  constructor(private readonly prisma: PrismaService) {}

  async importJobs(
    source: string,
    domain: string,
    keyword: string,
    location = 'Ile-de-France',
    limit = 10,
  ) {
    const apiKey = process.env.SERPER_API_KEY;

    if (!apiKey) {
      throw new Error('SERPER_API_KEY manquant dans apps/api/.env');
    }

    const searchLimit = 10;

    const query =
      `site:${domain} "${keyword}" "${location}"`;

    const response = await fetch(
      'https://google.serper.dev/search',
      {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          q: query,
          gl: 'fr',
          hl: 'fr',
          num: searchLimit,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();

      throw new Error(
        `Erreur Serper : ${response.status} ${error}`,
      );
    }

    const data = (await response.json()) as SerperResponse;

  const results = (data.organic ?? [])
  .filter((result) => {
    if (!result.title || !result.link) {
      return false;
    }

    if (!result.link.includes(domain)) {
      return false;
    }

    if (
      domain === 'free-work.com' &&
      !result.link.includes('/job-mission/')
    ) {
      return false;
    }

    //hello work 
    if (
  domain === 'hellowork.com' &&
  !result.link.includes('/fr-fr/emplois/')
) {
  return false;
}
// Welcome to the Jungle
if (
  domain.includes('welcometothejungle.com') &&
  !result.link.includes('/jobs/')
) {
  return false;
}

// LinkedIn
if (
  domain === 'linkedin.com' &&
  !result.link.includes('/jobs/view/')
) {
  return false;
}

// Indeed
if (
  domain === 'indeed.com' &&
  !result.link.includes('/viewjob')
) {
  return false;
}

    return true;
  })
  .slice(0, limit);

    const savedJobs = [];

    for (const result of results) {
      const externalId = result.link!;

      const job = await this.prisma.job.upsert({
        where: {
          source_externalId: {
            userId: this.prisma.currentUserId,
            source,
            externalId,
          },
        },

        update: {
          title: result.title!,
          description: result.snippet ?? null,
          url: result.link!,
          raw: result as Prisma.InputJsonValue,
        },

        create: {
          source,
          externalId,

          title: result.title!,
          company: null,
          description: result.snippet ?? null,

          location: null,
          department: null,
          contractType: null,
          experience: null,
          salary: null,

          url: result.link!,

          sourceCreatedAt:
            this.parseDate(result.date),

          sourceUpdatedAt: null,

          raw: result as Prisma.InputJsonValue,
        },
      });

      savedJobs.push(job);
    }

    return {
      source,
      domain,
      keyword,
      location,
      found: data.organic?.length ?? 0,
      imported: savedJobs.length,
      jobs: savedJobs,
    };
  }

  private parseDate(
    value?: string,
  ): Date | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(value);

    return Number.isNaN(parsed.getTime())
      ? null
      : parsed;
  }
}