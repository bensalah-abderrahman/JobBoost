import { describe, expect, it } from 'vitest';
import { readCookie } from './cookie.util.js';

describe('readCookie', () => {
  it('trouve un cookie parmi plusieurs', () => {
    expect(readCookie('a=1; jb_session=abc; b=2', 'jb_session')).toBe('abc');
  });

  it("renvoie null s'il est absent ou si l'en-tête est vide", () => {
    expect(readCookie('a=1', 'jb_session')).toBeNull();
    expect(readCookie(undefined, 'jb_session')).toBeNull();
  });

  it('ne confond pas deux noms proches', () => {
    expect(readCookie('xjb_session=faux', 'jb_session')).toBeNull();
  });

  it('ignore une valeur mal encodée au lieu de planter', () => {
    expect(readCookie('jb_session=%E0%A4%A', 'jb_session')).toBeNull();
  });
});
