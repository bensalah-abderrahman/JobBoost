// Règles d'isolation des données par utilisateur.
// Pures et sans dépendance : testables sans base de données.

// Tables qui portent directement un userId.
const OWNED = new Set([
  'CandidateProfile',
  'Job',
  'Resume',
  'CoverLetter',
  'Application',
]);

// Tables rattachées au propriétaire via le profil ou l'offre.
const VIA_PROFILE = new Set(['Experience', 'Education', 'Skill', 'Project']);
const VIA_JOB = new Set(['JobAnalysis']);

const WHERE_UNIQUE_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'update',
  'delete',
]);

const WHERE_OPERATIONS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'updateManyAndReturn',
  'deleteMany',
]);

export function isScopedModel(model: string): boolean {
  return OWNED.has(model) || VIA_PROFILE.has(model) || VIA_JOB.has(model);
}

function ownerFilter(model: string, userId: string) {
  if (OWNED.has(model)) return { userId };
  if (VIA_PROFILE.has(model)) return { profile: { userId } };

  return { job: { userId } };
}

/**
 * Renvoie les arguments d'une requête Prisma restreints à `userId`.
 * Un modèle non concerné est renvoyé tel quel.
 */
export function scopeArgs(
  model: string,
  operation: string,
  args: unknown,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  if (!isScopedModel(model)) {
    return args;
  }

  if (!userId) {
    throw new Error(`Accès à ${model} sans utilisateur authentifié.`);
  }

  const filter = ownerFilter(model, userId);
  const owned = OWNED.has(model);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const next: any = { ...((args as object) ?? {}) };

  if (WHERE_UNIQUE_OPERATIONS.has(operation)) {
    next.where = { ...next.where, ...filter };
  } else if (WHERE_OPERATIONS.has(operation)) {
    next.where = next.where ? { AND: [next.where, filter] } : filter;
  } else if (operation === 'create' && owned) {
    next.data = { ...next.data, userId };
  } else if (
    (operation === 'createMany' || operation === 'createManyAndReturn') &&
    owned
  ) {
    const rows = Array.isArray(next.data) ? next.data : [next.data];

    next.data = rows.map((row: object) => ({ ...row, userId }));
  } else if (operation === 'upsert') {
    next.where = { ...next.where, ...filter };

    if (owned) {
      next.create = { ...next.create, userId };
    }
  }

  return next;
}
