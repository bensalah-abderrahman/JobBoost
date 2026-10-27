export const SESSION_COOKIE = 'jb_session';

/**
 * Lit un cookie dans l'en-tête `Cookie` sans dépendance externe.
 */
export function readCookie(
  header: string | undefined,
  name: string,
): string | null {
  if (!header) {
    return null;
  }

  for (const part of header.split(';')) {
    const index = part.indexOf('=');

    if (index === -1) {
      continue;
    }

    if (part.slice(0, index).trim() !== name) {
      continue;
    }

    const value = part.slice(index + 1).trim();

    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }

  return null;
}
