"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

type Provider = { id: string; label: string };

const ICONS: Record<string, ReactNode> = {
  google: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.29 14.3A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.3V6.6H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l4.01-3.1z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.28 6.6l4.01 3.1C6.23 6.86 8.88 4.75 12 4.75z" />
    </svg>
  ),
  github: (
    <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  ),
};

/**
 * Boutons « Continuer avec ... » : seuls les fournisseurs configurés
 * côté serveur s'affichent.
 */
export default function SocialButtons({ verb = "Continuer" }: { verb?: string }) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");

    setFailed(error === "oauth" || error === "provider");

    fetch("/api/auth/providers")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProviders(Array.isArray(data?.providers) ? data.providers : []))
      .catch(() => undefined);
  }, []);

  if (providers.length === 0 && !failed) {
    return null;
  }

  return (
    <div className="mt-6">
      {failed && (
        <p
          role="alert"
          className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-500"
        >
          La connexion avec ce service a échoué. Réessayez ou utilisez votre email.
        </p>
      )}

      <div className="space-y-2.5">
        {providers.map((provider) => (
          // Navigation complète : le fournisseur redirige vers l'API.
          <a
            key={provider.id}
            href={`/api/auth/oauth/${provider.id}`}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--jb-border)] text-[14px] font-medium transition hover:bg-violet-500/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
          >
            {ICONS[provider.id]}
            {verb} avec {provider.label}
          </a>
        ))}
      </div>

      {providers.length > 0 && (
        <div className="mt-5 flex items-center gap-3 text-[12px] text-[var(--jb-muted)]">
          <span className="h-px flex-1 bg-[var(--jb-border)]" />
          ou avec votre email
          <span className="h-px flex-1 bg-[var(--jb-border)]" />
        </div>
      )}
    </div>
  );
}
