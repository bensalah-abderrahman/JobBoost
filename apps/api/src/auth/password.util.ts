import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

function derive(
  password: string,
  salt: Buffer,
  keyLength: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

/**
 * Hache un mot de passe avec scrypt (fourni par Node, aucune dépendance).
 * Format stocké : scrypt$<sel base64>$<hash base64>
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, KEY_LENGTH);

  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, saltBase64, hashBase64] = stored.split('$');

  if (scheme !== 'scrypt' || !saltBase64 || !hashBase64) {
    return false;
  }

  const salt = Buffer.from(saltBase64, 'base64');
  const expected = Buffer.from(hashBase64, 'base64');
  const actual = await derive(password, salt, expected.length);

  return (
    actual.length === expected.length && timingSafeEqual(actual, expected)
  );
}
