import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';

import { ApplicationMethod } from '../../generated/prisma/enums.js';

@Injectable()
export class FranceTravailService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // AUTHENTIFICATION FRANCE TRAVAIL
  // ============================================================

  private async getAccessToken(): Promise<string> {
    const clientId =
      process.env.FT_CLIENT_ID;

    const clientSecret =
      process.env.FT_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error(
        'FT_CLIENT_ID ou FT_CLIENT_SECRET manquant dans .env',
      );
    }

    const body =
      new URLSearchParams({
        grant_type:
          'client_credentials',

        client_id:
          clientId,

        client_secret:
          clientSecret,

        scope:
          'api_offresdemploiv2 o2dsoffre',
      });

    const response =
      await fetch(
        'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire',
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/x-www-form-urlencoded',
          },

          body,
        },
      );

    if (!response.ok) {
      const error =
        await response.text();

      throw new Error(
        `Erreur authentification France Travail : ${response.status} ${error}`,
      );
    }

    const data =
      await response.json();

    return data.access_token;
  }

  // ============================================================
  // EXTRACTION EMAIL
  // ============================================================

  private extractEmail(
    ...values: unknown[]
  ): string | null {
    for (
      const value
      of values
    ) {
      if (!value) {
        continue;
      }

      const text =
        typeof value ===
        'string'
          ? value
          : JSON.stringify(
              value,
            );

      const match =
        text.match(
          /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
        );

      if (match) {
        return match[0]
          .trim()
          .toLowerCase();
      }
    }

    return null;
  }

  // ============================================================
  // EXTRACTION URL
  // ============================================================

  private extractUrl(
    ...values: unknown[]
  ): string | null {
    for (
      const value
      of values
    ) {
      if (!value) {
        continue;
      }

      const text =
        typeof value ===
        'string'
          ? value
          : JSON.stringify(
              value,
            );

      const match =
        text.match(
          /https?:\/\/[^\s<>"']+/i,
        );

      if (match) {
        return match[0]
          .replace(
            /[),.;]+$/,
            '',
          )
          .trim();
      }
    }

    return null;
  }

  // ============================================================
  // NORMALISATION URL
  // ============================================================

  private normalizeUrl(
    value: unknown,
  ): string | null {
    if (
      typeof value !==
      'string'
    ) {
      return null;
    }

    const url =
      value.trim();

    if (!url) {
      return null;
    }

    try {
      return new URL(
        url,
      ).toString();
    } catch {
      return null;
    }
  }

  // ============================================================
  // URL FRANCE TRAVAIL ?
  // ============================================================

  private isFranceTravailUrl(
    value: string | null,
  ): boolean {
    if (!value) {
      return false;
    }

    try {
      const hostname =
        new URL(
          value,
        ).hostname.toLowerCase();

      return (
        hostname.includes(
          'francetravail.fr',
        ) ||
        hostname.includes(
          'pole-emploi.fr',
        )
      );
    } catch {
      return false;
    }
  }

  // ============================================================
  // DÉTECTION DU MODE DE CANDIDATURE
  // ============================================================

  private detectApplicationMethod(
    offer: any,
  ): {
    applicationMethod:
      ApplicationMethod;

    applicationUrl:
      string | null;

    contactEmail:
      string | null;
  } {
    // ==========================================================
    // 1. URL DIRECTE DE POSTULATION
    //
    // C'est la donnée la plus importante.
    // Exemple :
    // France Travail affiche l'offre,
    // mais la candidature réelle est sur
    // lindustrie-recrute.fr.
    // ==========================================================

    const directApplicationUrl =
      this.normalizeUrl(
        offer.contact
          ?.urlPostulation,
      );

    if (
      directApplicationUrl
    ) {
      // --------------------------------------------------------
      // Si l'URL directe renvoie elle-même vers France Travail
      // --------------------------------------------------------

      if (
        this.isFranceTravailUrl(
          directApplicationUrl,
        )
      ) {
        return {
          applicationMethod:
            ApplicationMethod.FRANCE_TRAVAIL,

          applicationUrl:
            directApplicationUrl,

          contactEmail:
            null,
        };
      }

      // --------------------------------------------------------
      // Sinon c'est un site partenaire / ATS / entreprise
      // --------------------------------------------------------

      return {
        applicationMethod:
          ApplicationMethod.PARTNER,

        applicationUrl:
          directApplicationUrl,

        contactEmail:
          null,
      };
    }

    // ==========================================================
    // 2. EMAIL RECRUTEUR
    // ==========================================================

    const contactEmail =
      this.extractEmail(
        offer.contact,

        offer.entreprise,

        offer.description,
      );

    if (
      contactEmail
    ) {
      return {
        applicationMethod:
          ApplicationMethod.EMAIL,

        applicationUrl:
          null,

        contactEmail,
      };
    }

    // ==========================================================
    // 3. AUTRE URL DANS LE CONTACT
    //
    // Exemple :
    // coordonnees1 contient parfois directement un lien.
    // ==========================================================

    const contactUrl =
      this.extractUrl(
        offer.contact
          ?.coordonnees1,

        offer.contact
          ?.coordonnees2,

        offer.contact,
      );

    if (
      contactUrl
    ) {
      if (
        this.isFranceTravailUrl(
          contactUrl,
        )
      ) {
        return {
          applicationMethod:
            ApplicationMethod.FRANCE_TRAVAIL,

          applicationUrl:
            contactUrl,

          contactEmail:
            null,
        };
      }

      return {
        applicationMethod:
          ApplicationMethod.PARTNER,

        applicationUrl:
          contactUrl,

        contactEmail:
          null,
      };
    }

    // ==========================================================
    // 4. URL D'ORIGINE
    // ==========================================================

    const originUrl =
      this.normalizeUrl(
        offer.origineOffre
          ?.urlOrigine,
      );

    if (
      originUrl
    ) {
      if (
        this.isFranceTravailUrl(
          originUrl,
        )
      ) {
        return {
          applicationMethod:
            ApplicationMethod.FRANCE_TRAVAIL,

          applicationUrl:
            originUrl,

          contactEmail:
            null,
        };
      }

      return {
        applicationMethod:
          ApplicationMethod.PARTNER,

        applicationUrl:
          originUrl,

        contactEmail:
          null,
      };
    }

    // ==========================================================
    // 5. AUCUNE INFORMATION DE POSTULATION
    //
    // L'offre vient de France Travail :
    // on garde donc France Travail comme fallback.
    // ==========================================================

    return {
      applicationMethod:
        ApplicationMethod.FRANCE_TRAVAIL,

      applicationUrl:
        null,

      contactEmail:
        null,
    };
  }

  // ============================================================
  // IMPORT OFFRES
  // ============================================================

  async importLatest(
    keyword =
      'développeur',

    limit =
      3,
  ) {
    const accessToken =
      await this.getAccessToken();

    const safeLimit =
      Math.min(
        Math.max(
          limit,
          1,
        ),
        50,
      );

    const params =
      new URLSearchParams({
        motsCles:
          keyword,

        publieeDepuis:
          '1',

        range:
          `0-${safeLimit - 1}`,
      });

    const response =
      await fetch(
        `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?${params.toString()}`,
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            Accept:
              'application/json',
          },
        },
      );

    if (!response.ok) {
      const error =
        await response.text();

      throw new Error(
        `Erreur API France Travail : ${response.status} ${error}`,
      );
    }

    const data =
      await response.json();

    const offers =
      data.resultats ??
      [];

    const savedJobs = [];

    // ============================================================
    // SAUVEGARDE
    // ============================================================

    for (
      const offer
      of offers
    ) {
      // ========================================================
      // DÉTECTION DU MODE DE CANDIDATURE
      // ========================================================

      const application =
        this.detectApplicationMethod(
          offer,
        );

      console.log(
        '[FRANCE TRAVAIL]',
        offer.id,
        {
          applicationMethod:
            application.applicationMethod,

          applicationUrl:
            application.applicationUrl,

          contactEmail:
            application.contactEmail,
        },
      );

      // ========================================================
      // URL DE CONSULTATION DE L'OFFRE
      //
      // On garde la fiche France Travail dans job.url.
      // applicationUrl contient, elle, le vrai lien de candidature.
      // ========================================================

      const jobUrl =
        this.normalizeUrl(
          offer.origineOffre
            ?.urlOrigine,
        ) ??
        `https://candidat.francetravail.fr/offres/recherche/detail/${offer.id}`;

      // ========================================================
      // UPSERT
      // ========================================================

      const job =
        await this.prisma.job.upsert({
          where: {
            source_externalId: {
              userId: this.prisma.currentUserId,
              source:
                'FRANCE_TRAVAIL',

              externalId:
                offer.id,
            },
          },

          // ====================================================
          // UPDATE
          // ====================================================

          update: {
            title:
              offer.intitule,

            company:
              offer.entreprise
                ?.nom ??
              null,

            description:
              offer.description ??
              null,

            location:
              offer.lieuTravail
                ?.libelle ??
              null,

            contractType:
              offer.typeContratLibelle ??
              offer.typeContrat ??
              null,

            experience:
              offer.experienceLibelle ??
              null,

            salary:
              offer.salaire
                ?.libelle ??
              offer.salaire
                ?.commentaire ??
              null,

            // --------------------------------------------------
            // URL pour consulter l'offre
            // --------------------------------------------------

            url:
              jobUrl,

            // --------------------------------------------------
            // URL / méthode pour réellement candidater
            // --------------------------------------------------

            applicationMethod:
              application.applicationMethod,

            applicationUrl:
              application.applicationUrl,

            contactEmail:
              application.contactEmail,

            sourceCreatedAt:
              offer.dateCreation
                ? new Date(
                    offer.dateCreation,
                  )
                : null,

            sourceUpdatedAt:
              offer.dateActualisation
                ? new Date(
                    offer.dateActualisation,
                  )
                : null,

            raw:
              offer,
          },

          // ====================================================
          // CREATE
          // ====================================================

          create: {
            source:
              'FRANCE_TRAVAIL',

            externalId:
              offer.id,

            title:
              offer.intitule,

            company:
              offer.entreprise
                ?.nom ??
              null,

            description:
              offer.description ??
              null,

            location:
              offer.lieuTravail
                ?.libelle ??
              null,

            department:
              null,

            contractType:
              offer.typeContratLibelle ??
              offer.typeContrat ??
              null,

            experience:
              offer.experienceLibelle ??
              null,

            salary:
              offer.salaire
                ?.libelle ??
              offer.salaire
                ?.commentaire ??
              null,

            // --------------------------------------------------
            // URL publique de l'offre
            // --------------------------------------------------

            url:
              jobUrl,

            // --------------------------------------------------
            // VRAI MODE DE CANDIDATURE
            // --------------------------------------------------

            applicationMethod:
              application.applicationMethod,

            applicationUrl:
              application.applicationUrl,

            contactEmail:
              application.contactEmail,

            sourceCreatedAt:
              offer.dateCreation
                ? new Date(
                    offer.dateCreation,
                  )
                : null,

            sourceUpdatedAt:
              offer.dateActualisation
                ? new Date(
                    offer.dateActualisation,
                  )
                : null,

            raw:
              offer,
          },
        });

      savedJobs.push(
        job,
      );
    }

    return {
      keyword,

      imported:
        savedJobs.length,

      jobs:
        savedJobs,
    };
  }
}