import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';

type AdzunaJob = {
    id: string;
    title: string;
    description?: string;

    company?: {
        display_name?: string;
    };

    location?: {
        display_name?: string;
    };

    contract_type?: string;
    contract_time?: string;

    salary_min?: number;
    salary_max?: number;

    redirect_url?: string;
    created?: string;

    [key: string]: unknown;
};

type AdzunaResponse = {
    results?: AdzunaJob[];
};

@Injectable()
export class AdzunaService {
    constructor(private readonly prisma: PrismaService) { }

    async importJobs(
        keyword = 'developpeur full stack',
        where = 'Ile-de-France',
        limit = 3,
    ) {
        const appId = process.env.ADZUNA_APP_ID;
        const appKey = process.env.ADZUNA_APP_KEY;

        if (!appId || !appKey) {
            throw new Error(
                'ADZUNA_APP_ID ou ADZUNA_APP_KEY manquant dans apps/api/.env',
            );
        }

        const safeLimit = Math.min(Math.max(limit, 1), 50);

        const params = new URLSearchParams({
            app_id: appId,
            app_key: appKey,
            results_per_page: String(safeLimit),
            what: keyword,
            where,
            sort_by: 'date',
        });

        const url =
            `https://api.adzuna.com/v1/api/jobs/fr/search/1?${params.toString()}`;

        const response = await fetch(url, {
            headers: {
                Accept: 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.text();

            throw new Error(
                `Erreur Adzuna : ${response.status} ${error}`,
            );
        }

        const data = (await response.json()) as AdzunaResponse;
        const offers = data.results ?? [];

        const savedJobs = [];

        for (const offer of offers) {
            const salary = this.formatSalary(
                offer.salary_min,
                offer.salary_max,
            );

            const job = await this.prisma.job.upsert({
                where: {
                    source_externalId: {
                      userId: this.prisma.currentUserId,
                        source: 'ADZUNA',
                        externalId: String(offer.id),
                    },
                },

                update: {
                    title: offer.title,

                    company:
                        offer.company?.display_name ?? null,

                    description:
                        offer.description ?? null,

                    location:
                        offer.location?.display_name ?? null,

                    contractType:
                        offer.contract_type ??
                        offer.contract_time ??
                        null,

                    salary,

                    url:
                        offer.redirect_url ?? null,

                    sourceCreatedAt:
                        offer.created
                            ? new Date(offer.created)
                            : null,

                    raw: offer as Prisma.InputJsonValue,
                },

                create: {
                    source: 'ADZUNA',
                    externalId: String(offer.id),

                    title: offer.title,

                    company:
                        offer.company?.display_name ?? null,

                    description:
                        offer.description ?? null,

                    location:
                        offer.location?.display_name ?? null,

                    department: null,

                    contractType:
                        offer.contract_type ??
                        offer.contract_time ??
                        null,

                    experience: null,

                    salary,

                    url:
                        offer.redirect_url ?? null,

                    sourceCreatedAt:
                        offer.created
                            ? new Date(offer.created)
                            : null,

                    sourceUpdatedAt: null,

                    raw: offer as Prisma.InputJsonValue,
                },
            });

            savedJobs.push(job);
        }

        return {
            source: 'ADZUNA',
            keyword,
            where,
            imported: savedJobs.length,
            jobs: savedJobs,
        };
    }

    private formatSalary(
        min?: number,
        max?: number,
    ): string | null {
        if (min == null && max == null) {
            return null;
        }

        if (min != null && max != null) {
            return `${Math.round(min)} € - ${Math.round(max)} €`;
        }

        if (min != null) {
            return `À partir de ${Math.round(min)} €`;
        }

        return `Jusqu'à ${Math.round(max!)} €`;
    }
}