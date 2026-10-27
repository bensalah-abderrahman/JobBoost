import { BadGatewayException, Injectable } from '@nestjs/common';

type Profile = {
  email: string;
  firstName: string;
  lastName: string;
};

type Provider = {
  label: string;
  clientIdEnv: string;
  clientSecretEnv: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  fetchProfile: (accessToken: string) => Promise<Profile>;
};

async function getJson(url: string, token: string) {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'User-Agent': 'JobBoost-AI',
    },
  });

  if (!response.ok) {
    throw new BadGatewayException(`Réponse ${response.status} de ${url}`);
  }

  return response.json();
}

/**
 * Pour ajouter un fournisseur (Microsoft, LinkedIn, ...), il suffit
 * d'ajouter une entrée ici et ses deux variables CLIENT_ID / CLIENT_SECRET.
 */
const PROVIDERS: Record<string, Provider> = {
  google: {
    label: 'Google',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile',
    async fetchProfile(token) {
      const data = await getJson(
        'https://openidconnect.googleapis.com/v1/userinfo',
        token,
      );

      if (!data.email || data.email_verified !== true) {
        throw new BadGatewayException('Adresse Google non vérifiée.');
      }

      return {
        email: data.email,
        firstName: data.given_name ?? '',
        lastName: data.family_name ?? '',
      };
    },
  },

  github: {
    label: 'GitHub',
    clientIdEnv: 'GITHUB_CLIENT_ID',
    clientSecretEnv: 'GITHUB_CLIENT_SECRET',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scope: 'read:user user:email',
    async fetchProfile(token) {
      const user = await getJson('https://api.github.com/user', token);
      const emails: { email: string; primary: boolean; verified: boolean }[] =
        await getJson('https://api.github.com/user/emails', token);

      const chosen =
        emails.find((item) => item.primary && item.verified) ??
        emails.find((item) => item.verified);

      if (!chosen) {
        throw new BadGatewayException('Aucune adresse GitHub vérifiée.');
      }

      const [firstName = '', ...rest] = String(user.name ?? user.login ?? '')
        .trim()
        .split(/\s+/);

      return {
        email: chosen.email,
        firstName,
        lastName: rest.join(' '),
      };
    },
  },
};

@Injectable()
export class OAuthService {
  /** Fournisseurs dont les clés sont configurées. */
  enabled(): { id: string; label: string }[] {
    return Object.entries(PROVIDERS)
      .filter(
        ([, provider]) =>
          process.env[provider.clientIdEnv] &&
          process.env[provider.clientSecretEnv],
      )
      .map(([id, provider]) => ({ id, label: provider.label }));
  }

  private get(id: string) {
    const provider = PROVIDERS[id];

    if (
      !provider ||
      !process.env[provider.clientIdEnv] ||
      !process.env[provider.clientSecretEnv]
    ) {
      return null;
    }

    return provider;
  }

  has(id: string) {
    return this.get(id) !== null;
  }

  private redirectUri(id: string) {
    const base = (process.env.APP_URL ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );

    return `${base}/api/auth/oauth/${id}/callback`;
  }

  authorizeUrl(id: string, state: string) {
    const provider = this.get(id);

    if (!provider) {
      return null;
    }

    const params = new URLSearchParams({
      client_id: process.env[provider.clientIdEnv] as string,
      redirect_uri: this.redirectUri(id),
      response_type: 'code',
      scope: provider.scope,
      state,
    });

    return `${provider.authorizeUrl}?${params.toString()}`;
  }

  async profileFromCode(id: string, code: string): Promise<Profile> {
    const provider = this.get(id);

    if (!provider) {
      throw new BadGatewayException('Fournisseur non configuré.');
    }

    const response = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env[provider.clientIdEnv] as string,
        client_secret: process.env[provider.clientSecretEnv] as string,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri(id),
      }).toString(),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.access_token) {
      throw new BadGatewayException('Échange du code refusé.');
    }

    return provider.fetchProfile(data.access_token);
  }
}
