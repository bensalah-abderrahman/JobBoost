import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import {
  userContext,
} from '../../prisma/prisma.service.js';

@Injectable()
export class AutomationService {
  async runFranceTravail() {
    // La collecte tourne dans n8n pour le propriétaire de l'instance.
    const owner =
      process.env.ADMIN_EMAIL
        ?.trim()
        .toLowerCase();

    if (
      !owner ||
      userContext.getStore()?.email !== owner
    ) {
      throw new ForbiddenException(
        "La collecte automatique est réservée au propriétaire de l'application.",
      );
    }

    const webhookUrl =
      process.env.N8N_JOBBOOST_WEBHOOK_URL ??
      'http://localhost:5678/webhook/jobboost-morning';

    const response =
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },
        body: JSON.stringify({
          source:
            'JOBBOOST_UI',
          automation:
            'FRANCE_TRAVAIL',
          requestedAt:
            new Date().toISOString(),
        }),
      });

    if (!response.ok) {
      const error =
        await response.text();

      throw new BadGatewayException(
        `n8n indisponible : ${response.status} ${error}`,
      );
    }

    let n8nResponse:
      unknown = null;

    try {
      n8nResponse =
        await response.json();
    } catch {
      // Webhook "Respond Immediately"
      // peut retourner une réponse vide.
    }

    return {
      started:
        true,
      source:
        'FRANCE_TRAVAIL',
      message:
        'Automatisation France Travail lancée.',
      n8nResponse,
    };
  }
}