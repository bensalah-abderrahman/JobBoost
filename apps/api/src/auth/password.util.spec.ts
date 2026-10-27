import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.util.js';

describe('mots de passe', () => {
  it('accepte le bon mot de passe et refuse un mauvais', async () => {
    const hash = await hashPassword('un mot de passe solide');

    expect(await verifyPassword('un mot de passe solide', hash)).toBe(true);
    expect(await verifyPassword('un autre', hash)).toBe(false);
  });

  it('ne stocke jamais le mot de passe en clair et sale chaque hash', async () => {
    const a = await hashPassword('identique-identique');
    const b = await hashPassword('identique-identique');

    expect(a).not.toContain('identique');
    expect(a).not.toBe(b);
  });

  it("refuse les comptes sans mot de passe (connexion Google/GitHub)", async () => {
    expect(await verifyPassword('n-importe-quoi', 'oauth$disabled')).toBe(false);
    expect(await verifyPassword('x', '')).toBe(false);
  });
});
