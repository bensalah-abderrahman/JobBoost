import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import {
  userContext,
} from '../prisma/prisma.service.js';

import nodemailer, {
  Transporter,
} from 'nodemailer';

// ============================================================
// TYPES
// ============================================================

type SendApplicationEmailInput = {
  to: string;

  jobTitle: string;

  company?: string | null;

  body: string;

  resumeId: string;

  coverLetterId?: string | null;
};

@Injectable()
export class MailService {
  private transporter:
    | Transporter
    | null = null;

  // ============================================================
  // TRANSPORTER
  // ============================================================

  private getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    const host =
      process.env.SMTP_HOST;

    const port =
      Number(
        process.env.SMTP_PORT ??
          465,
      );

    const secure =
      String(
        process.env.SMTP_SECURE ??
          'true',
      ).toLowerCase() ===
      'true';

    const user =
      process.env.SMTP_USER;

    const password =
      process.env.SMTP_APP_PASSWORD;

    if (
      !host ||
      !user ||
      !password
    ) {
      throw new InternalServerErrorException(
        'Configuration SMTP incomplète.',
      );
    }

    this.transporter =
      nodemailer.createTransport({
        host,
        port,
        secure,

        auth: {
          user,
          pass: password,
        },
      });

    return this.transporter;
  }

  // ============================================================
  // VERIFY
  // ============================================================

  async verify() {
    const transporter =
      this.getTransporter();

    await transporter.verify();

    return {
      success: true,

      message:
        'Connexion SMTP valide.',
    };
  }

  // ============================================================
  // SEND APPLICATION
  // ============================================================

  async sendVerificationEmail(
    to: string,
    firstName: string,
    link: string,
  ) {
    const transporter =
      this.getTransporter();

    const fromName =
      process.env.SMTP_FROM_NAME ??
      'JobBoost AI';

    await transporter.sendMail({
      from: `"${fromName}" <${process.env.SMTP_USER}>`,
      to,
      subject:
        'Confirmez votre adresse email - JobBoost AI',
      text:
        `Bonjour ${firstName},\n\n` +
        'Pour activer votre compte JobBoost AI, ouvrez ce lien ' +
        '(valable 24 heures) :\n\n' +
        `${link}\n\n` +
        "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
    });
  }

  async sendApplicationEmail(
    input: SendApplicationEmailInput,
  ) {
    // Les envois partent de la boîte SMTP du propriétaire de l'instance :
    // ils lui sont réservés.
    const owner =
      process.env.ADMIN_EMAIL
        ?.trim()
        .toLowerCase();

    if (
      !owner ||
      userContext.getStore()?.email !== owner
    ) {
      throw new ForbiddenException(
        "L'envoi par email est réservé au propriétaire de l'application. Utilisez « Télécharger CV » et « Télécharger lettre ».",
      );
    }

    const to =
      input.to
        ?.trim()
        .toLowerCase();

    if (!to) {
      throw new BadRequestException(
        'Adresse email recruteur manquante.',
      );
    }

    if (
      !this.isValidEmail(to)
    ) {
      throw new BadRequestException(
        `Adresse email invalide : ${to}`,
      );
    }

    if (
      !input.resumeId
    ) {
      throw new BadRequestException(
        'CV manquant.',
      );
    }

    // ==========================================================
    // PDF
    // ==========================================================

    const resumeBuffer =
      await this.fetchPdf(
        `/resume/${input.resumeId}/pdf`,
        'CV',
      );

    let coverLetterBuffer:
      | Buffer
      | null = null;

    if (
      input.coverLetterId
    ) {
      coverLetterBuffer =
        await this.fetchPdf(
          `/cover-letter/${input.coverLetterId}/pdf`,
          'lettre de motivation',
        );
    }

    // ==========================================================
    // SUBJECT
    // ==========================================================

    const subjectParts = [
      'Candidature',
      input.jobTitle,
    ];

    if (
      input.company
        ?.trim()
    ) {
      subjectParts.push(
        input.company.trim(),
      );
    }

    const subject =
      subjectParts.join(
        ' — ',
      );

    // ==========================================================
    // ATTACHMENTS
    // ==========================================================

    const safeJobTitle =
      this.safeFileName(
        input.jobTitle,
      );

    const attachments = [
      {
        filename:
          `CV_Abderrahmane_Ben_Salah_${safeJobTitle}.pdf`,

        content:
          resumeBuffer,

        contentType:
          'application/pdf',
      },
    ];

    if (
      coverLetterBuffer
    ) {
      attachments.push({
        filename:
          `Lettre_Motivation_Abderrahmane_Ben_Salah_${safeJobTitle}.pdf`,

        content:
          coverLetterBuffer,

        contentType:
          'application/pdf',
      });
    }

    // ==========================================================
    // SEND
    // ==========================================================

    const transporter =
      this.getTransporter();

    const fromEmail =
      process.env.SMTP_USER;

    const fromName =
      process.env
        .SMTP_FROM_NAME ??
      'Abderrahmane Ben Salah';

    if (!fromEmail) {
      throw new InternalServerErrorException(
        'SMTP_USER manquant.',
      );
    }

    try {
      const result =
        await transporter.sendMail({
          from:
            `"${fromName}" <${fromEmail}>`,

          to,

          subject,

          text:
            input.body,

          attachments,
        });

      return {
        success: true,

        messageId:
          result.messageId,

        accepted:
          result.accepted,

        rejected:
          result.rejected,

        to,

        subject,
      };
    } catch (error) {
      console.error(
        '[MAIL] Erreur envoi candidature :',
        error,
      );

      throw new InternalServerErrorException(
        "Impossible d'envoyer l'email de candidature.",
      );
    }
  }

  // ============================================================
  // FETCH PDF
  // ============================================================

  private async fetchPdf(
    path: string,
    documentName: string,
  ): Promise<Buffer> {
    const baseUrl =
      (
        process.env
          .JOBBOOST_API_URL ??
        'http://127.0.0.1:3001'
      ).replace(
        /\/$/,
        '',
      );

    const url =
      `${baseUrl}${path}`;

    try {
      const response =
        await fetch(
          url,
          {
            method:
              'GET',

            headers: {
              Accept:
                'application/pdf',
              'x-internal-key':
                process.env
                  .INTERNAL_API_KEY ??
                '',
              'x-user-id':
                userContext.getStore()
                  ?.userId ?? '',
            },
          },
        );

      if (
        !response.ok
      ) {
        const message =
          await response.text();

        throw new Error(
          message ||
            `HTTP ${response.status}`,
        );
      }

      const arrayBuffer =
        await response.arrayBuffer();

      const buffer =
        Buffer.from(
          arrayBuffer,
        );

      if (
        buffer.length ===
        0
      ) {
        throw new Error(
          `${documentName} vide.`,
        );
      }

      return buffer;
    } catch (error) {
      console.error(
        `[MAIL] Impossible de récupérer ${documentName} :`,
        error,
      );

      throw new InternalServerErrorException(
        `Impossible de générer le ${documentName} pour la pièce jointe.`,
      );
    }
  }

  // ============================================================
  // EMAIL VALIDATION
  // ============================================================

  private isValidEmail(
    value: string,
  ) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value,
    );
  }

  // ============================================================
  // SAFE FILE NAME
  // ============================================================

  private safeFileName(
    value: string,
  ) {
    return value
      .normalize(
        'NFD',
      )
      .replace(
        /[\u0300-\u036f]/g,
        '',
      )
      .replace(
        /[^a-zA-Z0-9-_ ]/g,
        '',
      )
      .trim()
      .replace(
        /\s+/g,
        '_',
      )
      .slice(
        0,
        55,
      );
  }
}