import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PrismaService,
} from '../prisma/prisma.service.js';
import {
  mkdir,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import {
  homedir,
} from 'node:os';
import {
  join,
} from 'node:path';

@Injectable()
export class ApplicationFilesService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  async prepareFiles(
    applicationId: string,
  ) {
    const application =
      await this.prisma.application.findUnique({
        where: {
          id: applicationId,
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

    if (!application.resumeId) {
      throw new NotFoundException(
        'CV introuvable pour cette candidature',
      );
    }

    if (!application.coverLetterId) {
      throw new NotFoundException(
        'Lettre de motivation introuvable pour cette candidature',
      );
    }

    const directory =
      join(
        homedir(),
        'Documents',
        'JobBoost',
        'Candidatures',
      );

    await mkdir(
      directory,
      {
        recursive: true,
      },
    );

    // Supprime les anciens fichiers.
    const existingFiles =
      await readdir(
        directory,
      );

    for (
      const file
      of existingFiles
    ) {
      await rm(
        join(
          directory,
          file,
        ),
        {
          force: true,
          recursive: true,
        },
      );
    }

    const apiUrl =
      process.env.API_URL ??
      'http://127.0.0.1:3001';

    const internalHeaders = {
      'x-internal-key':
        process.env.INTERNAL_API_KEY ?? '',
      'x-user-id':
        this.prisma.currentUserId,
    };

    const [
      resumeResponse,
      coverLetterResponse,
    ] =
      await Promise.all([
        fetch(
          `${apiUrl}/resume/${application.resumeId}/pdf`,
          { headers: internalHeaders },
        ),
        fetch(
          `${apiUrl}/cover-letter/${application.coverLetterId}/pdf`,
          { headers: internalHeaders },
        ),
      ]);

    if (!resumeResponse.ok) {
      throw new Error(
        `Impossible de générer le CV : ${resumeResponse.status}`,
      );
    }

    if (!coverLetterResponse.ok) {
      throw new Error(
        `Impossible de générer la lettre : ${coverLetterResponse.status}`,
      );
    }

    const resumeBuffer =
      Buffer.from(
        await resumeResponse.arrayBuffer(),
      );

    const coverLetterBuffer =
      Buffer.from(
        await coverLetterResponse.arrayBuffer(),
      );

    const resumePath =
      join(
        directory,
        'CV.pdf',
      );

    const coverLetterPath =
      join(
        directory,
        'LettreMotivation.pdf',
      );

    await Promise.all([
      writeFile(
        resumePath,
        resumeBuffer,
      ),
      writeFile(
        coverLetterPath,
        coverLetterBuffer,
      ),
    ]);

    return {
      success: true,
      applicationId:
        application.id,
      jobTitle:
        application.job.title,
      directory,
      files: {
        resume:
          resumePath,
        coverLetter:
          coverLetterPath,
      },
    };
  }
}