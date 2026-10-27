import { describe, expect, it } from 'vitest';
import { buildUserUpdate } from './admin.rules.js';

const user = { id: 'u1', role: 'USER' };

describe('buildUserUpdate', () => {
  it('accorde une autorisation', () => {
    expect(buildUserUpdate(user, 'admin', { canCollect: true })).toEqual({
      canCollect: true,
    });
  });

  it('désactive puis réactive un compte', () => {
    const off = buildUserUpdate(user, 'admin', { disabled: true });
    expect(off.disabledAt).toBeInstanceOf(Date);
    expect(buildUserUpdate(user, 'admin', { disabled: false })).toEqual({
      disabledAt: null,
    });
  });

  it('refuse de modifier un administrateur', () => {
    expect(() =>
      buildUserUpdate({ id: 'a', role: 'ADMIN' }, 'x', { canCollect: true }),
    ).toThrow();
  });

  it('refuse de modifier son propre compte', () => {
    expect(() => buildUserUpdate(user, 'u1', { credits: 5 })).toThrow();
  });

  it('refuse une requête vide', () => {
    expect(() => buildUserUpdate(user, 'admin', {})).toThrow();
  });
});
