import { describe, expect, it } from 'vitest';
import { isScopedModel, scopeArgs } from './scope.js';

const ALICE = 'user-alice';

describe('scopeArgs : isolation des données par utilisateur', () => {
  it('ne touche pas aux modèles non concernés (User, Session)', () => {
    const args = { where: { email: 'a@b.fr' } };

    expect(isScopedModel('User')).toBe(false);
    expect(scopeArgs('User', 'findUnique', args, ALICE)).toBe(args);
    expect(scopeArgs('Session', 'deleteMany', args, ALICE)).toBe(args);
  });

  it('refuse toute requête sans utilisateur', () => {
    expect(() => scopeArgs('Job', 'findMany', {}, '')).toThrow(
      /sans utilisateur/,
    );
  });

  it.each(['CandidateProfile', 'Job', 'Resume', 'CoverLetter', 'Application'])(
    'findMany sur %s est limité au propriétaire',
    (model) => {
      expect(scopeArgs(model, 'findMany', undefined, ALICE)).toEqual({
        where: { userId: ALICE },
      });
    },
  );

  it('combine un where existant avec le filtre propriétaire (AND)', () => {
    const result = scopeArgs(
      'Job',
      'findMany',
      { where: { source: 'FRANCE_TRAVAIL' } },
      ALICE,
    );

    expect(result.where).toEqual({
      AND: [{ source: 'FRANCE_TRAVAIL' }, { userId: ALICE }],
    });
  });

  it('un OR dans le where ne peut pas contourner le filtre', () => {
    const result = scopeArgs(
      'Job',
      'findMany',
      { where: { OR: [{ userId: 'user-bob' }, { title: 'x' }] } },
      ALICE,
    );

    expect(result.where.AND).toContainEqual({ userId: ALICE });
  });

  it.each(['findUnique', 'findUniqueOrThrow', 'update', 'delete'])(
    '%s par identifiant ajoute le propriétaire',
    (operation) => {
      const result = scopeArgs(
        'Application',
        operation,
        { where: { id: 'app-de-bob' } },
        ALICE,
      );

      expect(result.where).toEqual({ id: 'app-de-bob', userId: ALICE });
    },
  );

  it("l'identifiant de propriétaire envoyé par le client est écrasé", () => {
    const result = scopeArgs(
      'Job',
      'findUnique',
      { where: { id: 'j1', userId: 'user-bob' } },
      ALICE,
    );

    expect(result.where.userId).toBe(ALICE);
  });

  it('create impose le propriétaire, même si le client en fournit un autre', () => {
    const result = scopeArgs(
      'Resume',
      'create',
      { data: { title: 'CV', userId: 'user-bob' } },
      ALICE,
    );

    expect(result.data).toEqual({ title: 'CV', userId: ALICE });
  });

  it('createMany impose le propriétaire sur chaque ligne', () => {
    const result = scopeArgs(
      'Job',
      'createMany',
      { data: [{ title: 'a' }, { title: 'b', userId: 'user-bob' }] },
      ALICE,
    );

    expect(result.data).toEqual([
      { title: 'a', userId: ALICE },
      { title: 'b', userId: ALICE },
    ]);
  });

  it('upsert filtre le where et impose le propriétaire à la création', () => {
    const result = scopeArgs(
      'Job',
      'upsert',
      {
        where: { source_externalId: { userId: ALICE, source: 'x', externalId: '1' } },
        create: { title: 't' },
        update: { title: 't2' },
      },
      ALICE,
    );

    expect(result.where.userId).toBe(ALICE);
    expect(result.create).toEqual({ title: 't', userId: ALICE });
    expect(result.update).toEqual({ title: 't2' });
  });

  it.each(['Experience', 'Education', 'Skill', 'Project'])(
    '%s passe par le profil du propriétaire',
    (model) => {
      expect(
        scopeArgs(model, 'update', { where: { id: 'e1' }, data: {} }, ALICE).where,
      ).toEqual({ id: 'e1', profile: { userId: ALICE } });
    },
  );

  it("JobAnalysis passe par l'offre du propriétaire", () => {
    const result = scopeArgs(
      'JobAnalysis',
      'upsert',
      { where: { jobId: 'j1' }, create: { jobId: 'j1' }, update: {} },
      ALICE,
    );

    expect(result.where).toEqual({ jobId: 'j1', job: { userId: ALICE } });
    // La table n'a pas de colonne userId : rien n'y est ajouté.
    expect(result.create).toEqual({ jobId: 'j1' });
  });

  it("n'altère pas l'objet d'arguments d'origine", () => {
    const args = { where: { id: '1' } };

    scopeArgs('Job', 'findUnique', args, ALICE);

    expect(args).toEqual({ where: { id: '1' } });
  });
});
