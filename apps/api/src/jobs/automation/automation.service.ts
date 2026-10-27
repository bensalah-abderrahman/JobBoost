import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import {
  userContext,
} from '../../prisma/prisma.service.js';
import {
  isAdmin,
  requirePermission,
} from '../../auth/permissions.js';

@Injectable()
export class AutomationService {
  /**
   * @param forUserId  réservé à l'administrateur : lance la collecte
   *                   pour le compte d'un autre utilisateur.
   */
  async runFranceTravail(forUserId?: string) {
    const current = userContext.getStore();

    if (forUserId && forUserId !== current?.userId) {
      if (!isAdmin()) {
        throw new ForbiddenException(
          "Seul l'administrateur peut lancer la collecte pour un autre compte.",
        );
      }
    } else {
      requirePermission(
        'canCollect',
        "La collecte automatique n'est pas activée pour votre compte. Demandez l'autorisation à l'administrateur.",
      );
    }

    const targetUserId = forUserId ?? current?.userId;

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
          // n8n transmet cet identifiant (x-user-id) à chaque appel API :
          // les offres arrivent dans le compte demandé.
          userId:
            targetUserId,
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