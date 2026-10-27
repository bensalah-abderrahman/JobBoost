import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UpsertJobDto } from './upsert-job.dto.js';
@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}
  async findAll() {
    return this.prisma.job.findMany({
      where: {
        applicationStatus: {
          not: 'ARCHIVED',
        },
      },
      include: {
        analysis: true,
      },
      orderBy: {
        sourceCreatedAt: 'desc',
      },
    });
  }
  async upsertJob(
    payload: UpsertJobDto,
  ) {
    if (!payload.externalId) {
      throw new BadRequestException(
        'externalId is required',
      );
    }
    if (!payload.source) {
      throw new BadRequestException(
        'source is required',
      );
    }
    if (!payload.title) {
      throw new BadRequestException(
        'title is required',
      );
    }
    const source =
      payload.source.toUpperCase();
    const externalId =
      payload.externalId;
    const existing =
      await this.prisma.job.findUnique({
        where: {
          source_externalId: {
            userId: this.prisma.currentUserId,
            source,
            externalId,
          },
        },
      });
    const commonData = {
      title:
        payload.title,
      company:
        payload.company || null,
      description:
        payload.description || null,
      location:
        payload.location || null,
      department:
        payload.postalCode
          ? payload.postalCode.substring(
              0,
              2,
            )
          : null,
      contractType:
        payload.contractType || null,
      experience:
        payload.experience || null,
      salary:
        payload.salary || null,
      url:
        payload.url || null,
      sourceCreatedAt:
        payload.dateCreated
          ? new Date(
              payload.dateCreated,
            )
          : null,
      sourceUpdatedAt:
        payload.dateUpdated
          ? new Date(
              payload.dateUpdated,
            )
          : null,
      raw: JSON.parse(
        JSON.stringify(
          payload,
        ),
      ),
    };
    const job =
      await this.prisma.job.upsert({
        where: {
          source_externalId: {
            userId: this.prisma.currentUserId,
            source,
            externalId,
          },
        },
        update:
          commonData,
        create: {
          source,
          externalId,
          ...commonData,
        },
        include: {
          analysis: true,
        },
      });
    return {
      isNew:
        !existing,
      needsAnalysis:
        !job.analysis &&
        job.applicationStatus !==
          'ARCHIVED',
      ignored:
        job.applicationStatus ===
        'ARCHIVED',
      job,
    };
  }
  async archiveJob(
    jobId: string,
  ) {
    const existing =
      await this.prisma.job.findUnique({
        where: {
          id:
            jobId,
        },
      });
    if (!existing) {
      throw new NotFoundException(
        `Job ${jobId} introuvable`,
      );
    }
    if (
      existing.applicationStatus ===
      'ARCHIVED'
    ) {
      return {
        success:
          true,
        alreadyArchived:
          true,
        message:
          'Offre déjà supprimée des opportunités',
        jobId,
      };
    }
    await this.prisma.job.update({
      where: {
        id:
          jobId,
      },
      data: {
        applicationStatus:
          'ARCHIVED',
      },
    });
    return {
      success:
        true,
      alreadyArchived:
        false,
      message:
        'Offre supprimée des opportunités',
      jobId,
    };
  }
  async markReadyToValidate(
    jobId: string,
  ) {
    const existing =
      await this.prisma.job.findUnique({
        where: {
          id: jobId,
        },
        include: {
          analysis: true,
        },
      });
    if (!existing) {
      throw new NotFoundException(
        `Job ${jobId} introuvable`,
      );
    }
    if (
      existing.applicationStatus ===
      'ARCHIVED'
    ) {
      throw new BadRequestException(
        'Cette offre a été supprimée des opportunités',
      );
    }
    const score =
      existing.analysis?.score ?? 0;
    if (score < 50) {
      throw new BadRequestException(
        'Le job doit avoir un score >= 50 pour passer en READY_TO_VALIDATE',
      );
    }
    const job =
      await this.prisma.job.update({
        where: {
          id: jobId,
        },
        data: {
          applicationStatus:
            'READY_TO_VALIDATE',
        },
        include: {
          analysis: true,
        },
      });
    return {
      success: true,
      message:
        'Job prêt à être validé',
      job: {
        id:
          job.id,
        externalId:
          job.externalId,
        source:
          job.source,
        title:
          job.title,
        company:
          job.company,
        location:
          job.location,
        contractType:
          job.contractType,
        url:
          job.url,
        applicationStatus:
          job.applicationStatus,
        applicationMethod:
          job.applicationMethod,
        applicationUrl:
          job.applicationUrl,
        contactEmail:
          job.contactEmail,
        score:
          job.analysis?.score ??
          null,
      },
    };
  }
  async prepareApplication(
    jobId: string,
  ) {
    const job =
      await this.prisma.job.findUnique({
        where: {
          id: jobId,
        },
        include: {
          analysis: true,
          applications: true,
        },
      });
    if (!job) {
      throw new NotFoundException(
        `Job ${jobId} introuvable`,
      );
    }
    if (
      job.applicationStatus ===
      'ARCHIVED'
    ) {
      throw new BadRequestException(
        'Cette offre a été supprimée des opportunités',
      );
    }
    const score =
      job.analysis?.score ?? 0;
    if (score < 50) {
      throw new BadRequestException(
        'Le job doit avoir un score >= 50 pour préparer une candidature',
      );
    }
    if (
      job.applicationStatus !==
      'READY_TO_VALIDATE'
    ) {
      throw new BadRequestException(
        `Le job doit être en READY_TO_VALIDATE. Statut actuel : ${job.applicationStatus}`,
      );
    }
    const application =
      await this.prisma.application.upsert({
        where: {
          jobId,
        },
        update: {
          status:
            'DRAFT',
        },
        create: {
          jobId,
          status:
            'DRAFT',
        },
        include: {
          job: {
            include: {
              analysis: true,
            },
          },
          resume: true,
          coverLetter: true,
        },
      });
    return {
      success: true,
      message:
        'Brouillon de candidature préparé',
      application: {
        id:
          application.id,
        jobId:
          application.jobId,
        status:
          application.status,
        resumeId:
          application.resumeId,
        coverLetterId:
          application.coverLetterId,
        job: {
          id:
            application.job.id,
          title:
            application.job.title,
          company:
            application.job.company,
          location:
            application.job.location,
          contractType:
            application.job.contractType,
          url:
            application.job.url,
          applicationStatus:
            application.job
              .applicationStatus,
          score:
            application.job.analysis
              ?.score ?? null,
          matchedSkills:
            application.job.analysis
              ?.matchedSkills ?? [],
          missingSkills:
            application.job.analysis
              ?.missingSkills ?? [],
        },
      },
    };
  }
}
