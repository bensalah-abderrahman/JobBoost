import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationMethod,
  ApplicationStatus,
} from '../generated/prisma/enums.js';
import {
  PrismaService,
} from '../prisma/prisma.service.js';
import {
  ResumeComposerService,
} from '../resume/resume-composer.service.js';
import {
  CoverLetterService,
} from '../cover-letter/cover-letter.service.js';
import {
  JobAnalyzerService,
} from '../llm/job-analyzer.service.js';
import {
  MailService,
} from '../mail/mail.service.js';
// ============================================================
// TYPES
// ============================================================
type CreateApplicationInput = {
  jobId: string;
  resumeId?: string | null;
  coverLetterId?: string | null;
  channel?: string | null;
  notes?: string | null;
};
// ============================================================
// SERVICE
// ============================================================
@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma:
      PrismaService,
    private readonly resumeComposerService:
      ResumeComposerService,
    private readonly coverLetterService:
      CoverLetterService,
    private readonly jobAnalyzerService:
      JobAnalyzerService,
    private readonly mailService:
      MailService,
  ) {}
  // ============================================================
  // PREPARE APPLICATION AUTOMATICALLY
  //
  // Offre
  // ↓
  // Analyse IA
  // ↓
  // CV
  // ↓
  // Lettre
  // ↓
  // Application READY_TO_VALIDATE
  // ============================================================
  async prepare(
    jobId: string,
  ) {
    // ----------------------------------------------------------
    // 1. OFFRE
    // ----------------------------------------------------------
    let job =
      await this.prisma.job.findUnique({
        where: {
          id: jobId,
        },
        include: {
          analysis: true,
        },
      });
    if (!job) {
      throw new NotFoundException(
        'Offre introuvable',
      );
    }
    // ----------------------------------------------------------
    // 2. ÉVITER LES DOUBLONS
    //
    // Si la candidature existe déjà :
    // on ne recrée PAS un CV et une lettre.
    // ----------------------------------------------------------
    const existingApplication =
      await this.prisma.application.findFirst({
        where: {
          jobId,
          status: {
            not:
              ApplicationStatus.ARCHIVED,
          },
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
    if (
      existingApplication &&
      existingApplication.status !==
        ApplicationStatus.DRAFT &&
      existingApplication.status !==
        ApplicationStatus.READY_TO_VALIDATE &&
      existingApplication.status !==
        ApplicationStatus.FAILED
    ) {
      return {
        alreadyPrepared:
          true,
        message:
          'Une candidature déjà avancée existe pour cette offre. Elle n’est pas régénérée automatiquement.',
        application:
          existingApplication,
        resume:
          existingApplication.resume,
        coverLetter:
          existingApplication.coverLetter,
      };
    }
    // ----------------------------------------------------------
    // 3. ANALYSE AUTOMATIQUE
    //
    // Si l'offre n'est pas encore analysée,
    // JobBoost lance automatiquement l'analyse.
    // ----------------------------------------------------------
    if (!job.analysis) {
      await this.jobAnalyzerService.analyze(
        jobId,
      );
      job =
        await this.prisma.job.findUnique({
          where: {
            id: jobId,
          },
          include: {
            analysis: true,
          },
        });
      if (!job) {
        throw new NotFoundException(
          'Offre introuvable après analyse',
        );
      }
    }
    // ----------------------------------------------------------
    // 4. SÉCURITÉ ANALYSE
    // ----------------------------------------------------------
    if (!job.analysis) {
      throw new BadRequestException(
        "Impossible de préparer la candidature : l'analyse de l'offre est absente.",
      );
    }
    // ----------------------------------------------------------
    // 5. VARIABLES POUR CLEANUP
    //
    // Si une étape échoue, on évite de laisser
    // des CV / lettres orphelins en base.
    // ----------------------------------------------------------
    let generatedResumeId:
      | string
      | null = null;
    let generatedCoverLetterId:
      | string
      | null = null;
    try {
      // --------------------------------------------------------
      // 6. GÉNÉRATION CV
      // --------------------------------------------------------
      const resumeResult =
        await this.resumeComposerService.generate(
          jobId,
        );
      const resume =
        resumeResult.resume;
      if (
        !resume ||
        !resume.id
      ) {
        throw new BadRequestException(
          'La génération du CV a échoué.',
        );
      }
      generatedResumeId =
        resume.id;
      // --------------------------------------------------------
      // 7. GÉNÉRATION LETTRE
      //
      // Ton CoverLetterService contient déjà :
      // - anti-hallucination
      // - réparation
      // - blocage si compétence interdite
      // --------------------------------------------------------
      const coverLetter =
        await this.coverLetterService.generate(
          jobId,
          resume.id,
        );
      if (
        !coverLetter ||
        !coverLetter.id
      ) {
        throw new BadRequestException(
          'La génération de la lettre a échoué.',
        );
      }
      generatedCoverLetterId =
        coverLetter.id;
      // --------------------------------------------------------
      // 8. DÉTERMINER LE CANAL
      // --------------------------------------------------------
      const channel =
        this.resolveChannel(
          job.applicationMethod,
          job.source,
        );
      // --------------------------------------------------------
      // 9. CRÉATION APPLICATION
      // --------------------------------------------------------
      const previousResumeId =
        existingApplication?.resumeId ??
        null;
      const previousCoverLetterId =
        existingApplication?.coverLetterId ??
        null;
      const application =
        existingApplication
          ? await this.prisma.application.update({
              where: {
                id:
                  existingApplication.id,
              },
              data: {
                resumeId:
                  resume.id,
                coverLetterId:
                  coverLetter.id,
                channel,
                notes:
                  'Candidature régénérée automatiquement par JobBoost AI après mise à jour du profil.',
                status:
                  ApplicationStatus.READY_TO_VALIDATE,
                appliedAt:
                  null,
              },
              include: {
                job: {
                  include: {
                    analysis:
                      true,
                  },
                },
                resume:
                  true,
                coverLetter:
                  true,
              },
            })
          : await this.create({
              jobId:
                job.id,
              resumeId:
                resume.id,
              coverLetterId:
                coverLetter.id,
              channel,
              notes:
                'Candidature préparée automatiquement par JobBoost AI.',
            });
      if (
        previousCoverLetterId &&
        previousCoverLetterId !==
          coverLetter.id
      ) {
        await this.prisma.coverLetter
          .delete({
            where: {
              id:
                previousCoverLetterId,
            },
          })
          .catch(() => {
            // Ancienne lettre déjà supprimée ou encore référencée.
          });
      }
      if (
        previousResumeId &&
        previousResumeId !==
          resume.id
      ) {
        await this.prisma.resume
          .delete({
            where: {
              id:
                previousResumeId,
            },
          })
          .catch(() => {
            // Ancien CV déjà supprimé ou encore référencé.
          });
      }
      // --------------------------------------------------------
      // 10. RÉPONSE
      // --------------------------------------------------------
      return {
        alreadyPrepared:
          false,
        regenerated:
          Boolean(
            existingApplication,
          ),
        message:
          existingApplication
            ? 'Candidature régénérée avec le profil à jour.'
            : 'Candidature préparée avec succès.',
        score:
          job.analysis.score,
        application,
        resume,
        coverLetter,
      };
    } catch (error) {
      // --------------------------------------------------------
      // CLEANUP LETTRE
      // --------------------------------------------------------
      if (
        generatedCoverLetterId
      ) {
        await this.prisma.coverLetter
          .delete({
            where: {
              id:
                generatedCoverLetterId,
            },
          })
          .catch(() => {
            // On ignore volontairement
            // une erreur de cleanup.
          });
      }
      // --------------------------------------------------------
      // CLEANUP CV
      // --------------------------------------------------------
      if (
        generatedResumeId
      ) {
        await this.prisma.resume
          .delete({
            where: {
              id:
                generatedResumeId,
            },
          })
          .catch(() => {
            // On ignore volontairement
            // une erreur de cleanup.
          });
      }
      throw error;
    }
  }
  // ============================================================
  // CREATE APPLICATION
  // ============================================================
  async create(
    input: CreateApplicationInput,
  ) {
    const job =
      await this.prisma.job.findUnique({
        where: {
          id: input.jobId,
        },
      });
    if (!job) {
      throw new NotFoundException(
        'Offre introuvable',
      );
    }
    // ==========================================================
    // VALIDATE RESUME
    // ==========================================================
    let resume = null;
    if (input.resumeId) {
      resume =
        await this.prisma.resume.findUnique({
          where: {
            id: input.resumeId,
          },
        });
      if (!resume) {
        throw new NotFoundException(
          'CV introuvable',
        );
      }
      if (
        resume.jobId &&
        resume.jobId !== input.jobId
      ) {
        throw new BadRequestException(
          'Le CV ne correspond pas à cette offre',
        );
      }
    }
    // ==========================================================
    // VALIDATE COVER LETTER
    // ==========================================================
    let coverLetter = null;
    if (input.coverLetterId) {
      coverLetter =
        await this.prisma.coverLetter.findUnique({
          where: {
            id: input.coverLetterId,
          },
        });
      if (!coverLetter) {
        throw new NotFoundException(
          'Lettre de motivation introuvable',
        );
      }
      if (
        coverLetter.jobId !==
        input.jobId
      ) {
        throw new BadRequestException(
          'La lettre de motivation ne correspond pas à cette offre',
        );
      }
      if (
        input.resumeId &&
        coverLetter.resumeId &&
        coverLetter.resumeId !==
          input.resumeId
      ) {
        throw new BadRequestException(
          'La lettre de motivation ne correspond pas au CV sélectionné',
        );
      }
    }
    // ==========================================================
    // AVOID DUPLICATE ACTIVE APPLICATION
    // ==========================================================
    const existing =
      await this.prisma.application.findFirst({
        where: {
          jobId:
            input.jobId,
          status: {
            not:
              ApplicationStatus.ARCHIVED,
          },
        },
      });
    if (existing) {
      throw new BadRequestException(
        'Une candidature existe déjà pour cette offre',
      );
    }
    // ==========================================================
    // CREATE
    // ==========================================================
    return this.prisma.application.create({
      data: {
        jobId:
          input.jobId,
        resumeId:
          input.resumeId ??
          null,
        coverLetterId:
          input.coverLetterId ??
          null,
        channel:
          input.channel?.trim() ||
          null,
        notes:
          input.notes?.trim() ||
          null,
        // Contrôle humain obligatoire.
        status:
          ApplicationStatus.READY_TO_VALIDATE,
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
  }
  // ============================================================
  // LIST APPLICATIONS
  // ============================================================
  async findAll() {
    return this.prisma.application.findMany({
      orderBy: {
        createdAt:
          'desc',
      },
      include: {
        job: {
          include: {
            analysis: true,
          },
        },
        resume: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
          },
        },
        coverLetter: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
  }
  // ============================================================
  // GET ONE
  // ============================================================
  async findOne(
    id: string,
  ) {
    const application =
      await this.prisma.application.findUnique({
        where: {
          id,
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
    if (!application) {
      throw new NotFoundException(
        'Candidature introuvable',
      );
    }
    return application;
  }
  // ============================================================
  // UPDATE STATUS
  // ============================================================
  async updateStatus(
    id: string,
    statusValue: string,
  ) {
    const application =
      await this.prisma.application.findUnique({
        where: {
          id,
        },
      });
    if (!application) {
      throw new NotFoundException(
        'Candidature introuvable',
      );
    }
    const status =
      this.parseStatus(
        statusValue,
      );
    // ==========================================================
    // SENT : CV OBLIGATOIRE
    // ==========================================================
    if (
      status ===
        ApplicationStatus.SENT &&
      !application.resumeId
    ) {
      throw new BadRequestException(
        'Impossible de marquer la candidature comme envoyée sans CV.',
      );
    }
    // ==========================================================
    // SENT :
    // seulement après validation/ou envoi réel
    // ==========================================================
    if (
      status ===
        ApplicationStatus.SENT &&
      application.status !==
        ApplicationStatus.APPROVED &&
      application.status !==
        ApplicationStatus.SENDING &&
      application.status !==
        ApplicationStatus.SENT
    ) {
      throw new BadRequestException(
        `Impossible de confirmer l'envoi depuis le statut ${application.status}.`,
      );
    }
    // ==========================================================
    // UPDATE
    // ==========================================================
    return this.prisma.application.update({
      where: {
        id,
      },
      data: {
        status,
        appliedAt:
          status ===
          ApplicationStatus.SENT
            ? application.appliedAt ??
              new Date()
            : application.appliedAt,
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
  }
  // ============================================================
  // UPDATE APPLICATION
  // ============================================================
  async update(
    id: string,
    input: {
      channel?: string | null;
      notes?: string | null;
      followUpAt?: string | null;
    },
  ) {
    const application =
      await this.prisma.application.findUnique({
        where: {
          id,
        },
      });
    if (!application) {
      throw new NotFoundException(
        'Candidature introuvable',
      );
    }
    let followUpAt:
      | Date
      | null
      | undefined;
    if (
      input.followUpAt !==
      undefined
    ) {
      if (!input.followUpAt) {
        followUpAt =
          null;
      } else {
        const date =
          new Date(
            input.followUpAt,
          );
        if (
          Number.isNaN(
            date.getTime(),
          )
        ) {
          throw new BadRequestException(
            'Date de relance invalide',
          );
        }
        followUpAt =
          date;
      }
    }
    return this.prisma.application.update({
      where: {
        id,
      },
      data: {
        ...(input.channel !== undefined
          ? {
              channel:
                input.channel?.trim() ||
                null,
            }
          : {}),
        ...(input.notes !== undefined
          ? {
              notes:
                input.notes?.trim() ||
                null,
            }
          : {}),
        ...(followUpAt !== undefined
          ? {
              followUpAt,
            }
          : {}),
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
  }
  // ============================================================
  // SEND / START APPLICATION WORKFLOW
  // ============================================================
  async send(
    id: string,
  ) {
    const application =
      await this.prisma.application.findUnique({
        where: {
          id,
        },
        include: {
          job: true,
          resume: true,
          coverLetter: true,
        },
      });
    if (!application) {
      throw new NotFoundException(
        'Candidature introuvable',
      );
    }
    const method =
      application.job.applicationMethod;
    const url =
      application.job.applicationUrl ??
      application.job.url ??
      null;
    const isLegacyApprovedEmail =
      method ===
        ApplicationMethod.EMAIL &&
      application.status ===
        ApplicationStatus.APPROVED;
    // ==========================================================
    // STATUS CHECK
    // ==========================================================
    if (
      application.status !==
        ApplicationStatus.READY_TO_VALIDATE &&
      application.status !==
        ApplicationStatus.FAILED &&
      !isLegacyApprovedEmail
    ) {
      throw new BadRequestException(
        `Impossible de lancer la candidature depuis le statut ${application.status}.`,
      );
    }
    // ==========================================================
    // DOCUMENTS
    // ==========================================================
    if (!application.resume) {
      throw new BadRequestException(
        'Aucun CV lié à cette candidature.',
      );
    }
    if (!application.coverLetter) {
      throw new BadRequestException(
        'Aucune lettre de motivation liée à cette candidature.',
      );
    }
    // ==========================================================
    // VALIDATION DESTINATION AVANT CHANGEMENT DE STATUT
    // ==========================================================
    if (
      method ===
      ApplicationMethod.FRANCE_TRAVAIL
    ) {
      if (!url) {
        throw new BadRequestException(
          "Aucune URL de candidature France Travail n'est disponible.",
        );
      }
    }
    if (
      method ===
        ApplicationMethod.PARTNER ||
      method ===
        ApplicationMethod.EXTERNAL_SITE
    ) {
      if (!url) {
        throw new BadRequestException(
          'Aucune URL de candidature disponible.',
        );
      }
    }
    if (
      method ===
      ApplicationMethod.EMAIL
    ) {
      if (
        !application.job.contactEmail
      ) {
        throw new BadRequestException(
          'Aucune adresse email recruteur disponible.',
        );
      }
    }
    // ==========================================================
    // VALIDATION HUMAINE
    // Le clic sur "Valider et postuler" valide la candidature.
    // updateMany sert aussi de verrou simple contre les doubles clics.
    // ==========================================================
    let approved =
      application;
    if (!isLegacyApprovedEmail) {
      const transition =
        await this.prisma.application.updateMany({
          where: {
            id,
            status:
              application.status,
          },
          data: {
            status:
              ApplicationStatus.APPROVED,
          },
        });
      if (
        transition.count !==
        1
      ) {
        throw new BadRequestException(
          'La candidature a déjà été traitée. Recharge la page avant de réessayer.',
        );
      }
      const refreshed =
        await this.prisma.application.findUnique({
          where: {
            id,
          },
          include: {
            job: true,
            resume: true,
            coverLetter: true,
          },
        });
      if (!refreshed) {
        throw new NotFoundException(
          'Candidature introuvable après validation.',
        );
      }
      approved =
        refreshed;
    }
    // ==========================================================
    // FRANCE TRAVAIL
    // ==========================================================
    if (
      method ===
      ApplicationMethod.FRANCE_TRAVAIL
    ) {
      return {
        application:
          approved,
        action:
          'OPEN_URL' as const,
        method:
          'FRANCE_TRAVAIL',
        url:
          url!,
      };
    }
    // ==========================================================
    // PARTNER / EXTERNAL
    // ==========================================================
    if (
      method ===
        ApplicationMethod.PARTNER ||
      method ===
        ApplicationMethod.EXTERNAL_SITE
    ) {
      return {
        application:
          approved,
        action:
          'OPEN_URL' as const,
        method,
        url:
          url!,
      };
    }
    // ==========================================================
    // EMAIL RÉEL
    // APPROVED
    // ↓
    // SENDING
    // ↓
    // SMTP Gmail + CV + lettre
    // ↓
    // SENT ou FAILED
    // ==========================================================
    if (
      method ===
      ApplicationMethod.EMAIL
    ) {
      const contactEmail =
        application.job.contactEmail!;
      await this.prisma.application.update({
        where: {
          id,
        },
        data: {
          status:
            ApplicationStatus.SENDING,
          channel:
            'EMAIL',
        },
      });
      try {
        const candidate =
          await this.prisma.candidateProfile.findFirst({
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          });
        const candidateName =
          candidate
            ? [
                candidate.firstName,
                candidate.lastName,
              ]
                .filter(Boolean)
                .join(' ')
            : process.env.SMTP_FROM_NAME ??
              'Candidat';
        const companyLabel =
          application.job.company
            ? ` au sein de ${application.job.company}`
            : '';
        const signature =
          [
            candidateName,
            candidate?.email ??
              process.env.SMTP_USER ??
              null,
            candidate?.phone ??
              null,
          ]
            .filter(
              (
                value,
              ): value is string =>
                Boolean(
                  value?.trim(),
                ),
            )
            .join('\n');
        const body =
          `Bonjour,\n\n` +
          `Je vous adresse ma candidature au poste de ${application.job.title}${companyLabel}.\n\n` +
          `Vous trouverez en pièces jointes mon CV ainsi que ma lettre de motivation.\n\n` +
          `Je reste à votre disposition pour tout échange complémentaire.\n\n` +
          `Cordialement,\n${signature}`;
        const mailResult =
          await this.mailService.sendApplicationEmail({
            to:
              contactEmail,
            jobTitle:
              application.job.title,
            company:
              application.job.company,
            body,
            resumeId:
              application.resume.id,
            coverLetterId:
              application.coverLetter.id,
          });
        const sent =
          await this.prisma.application.update({
            where: {
              id,
            },
            data: {
              status:
                ApplicationStatus.SENT,
              channel:
                'EMAIL',
              appliedAt:
                approved.appliedAt ??
                new Date(),
            },
            include: {
              job: true,
              resume: true,
              coverLetter: true,
            },
          });
        return {
          application:
            sent,
          action:
            'EMAIL_SENT' as const,
          method:
            'EMAIL' as const,
          email:
            contactEmail,
          messageId:
            mailResult.messageId,
        };
      } catch (error) {
        await this.prisma.application
          .update({
            where: {
              id,
            },
            data: {
              status:
                ApplicationStatus.FAILED,
            },
          })
          .catch(() => {
            // On conserve l'erreur d'origine.
          });
        throw error;
      }
    }
    // ==========================================================
    // MANUAL / UNKNOWN
    // ==========================================================
    return {
      application:
        approved,
      action:
        'MANUAL' as const,
      method:
        method ??
        ApplicationMethod.UNKNOWN,
      url,
    };
  }
  // ============================================================
  // DETERMINE CHANNEL
  // ============================================================
  private resolveChannel(
    method: ApplicationMethod,
    source: string,
  ): string {
    switch (method) {
      case ApplicationMethod.EMAIL:
        return 'EMAIL';
      case ApplicationMethod.FRANCE_TRAVAIL:
        return 'FRANCE_TRAVAIL';
      case ApplicationMethod.PARTNER:
        return 'PARTNER';
      case ApplicationMethod.EXTERNAL_SITE:
        return 'EXTERNAL_SITE';
      case ApplicationMethod.MANUAL:
        return 'MANUAL';
      case ApplicationMethod.UNKNOWN:
      default:
        return source;
    }
  }
  // ============================================================
  // VALIDATE STATUS
  // ============================================================
  private parseStatus(
    value: string,
  ): ApplicationStatus {
    const normalized =
      value
        ?.trim()
        .toUpperCase();
    const allowed =
      Object.values(
        ApplicationStatus,
      );
    if (
      !allowed.includes(
        normalized as ApplicationStatus,
      )
    ) {
      throw new BadRequestException(
        `Statut invalide. Valeurs autorisées : ${allowed.join(
          ', ',
        )}`,
      );
    }
    return normalized as ApplicationStatus;
  }
}
