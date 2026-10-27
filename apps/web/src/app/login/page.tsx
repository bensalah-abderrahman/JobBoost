"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import AuthShell from "../../components/auth-shell";
import SocialButtons from "../../components/social-buttons";

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--jb-border)] bg-transparent text-[14px] text-[var(--jb-text)] outline-none transition placeholder:text-[var(--jb-muted)] focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resent, setResent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        setUnverified(res.status === 403);
        const body = await res.json().catch(() => null);
        setError(
          typeof body?.message === "string"
            ? body.message
            : "Connexion impossible. Réessayez.",
        );
        return;
      }

      const next = new URLSearchParams(window.location.search).get("next");
      // Uniquement un chemin interne.
      window.location.href =
        next && next.startsWith("/") && !next.startsWith("//") ? next : "/start";
    } catch {
      setError("Le serveur ne répond pas. Vérifiez que l'API est démarrée.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => undefined);
    setResent(true);
  }

  return (
    <AuthShell
      title="Connexion"
      subtitle="Accédez à votre espace de travail."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link
            href="/register"
            className="font-medium text-violet-500 hover:underline"
          >
            Créer un compte
          </Link>
        </>
      }
    >
          <SocialButtons />

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-[13px] font-medium"
              >
                Adresse email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--jb-muted)]"
                />
                <input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.fr"
                  className={`${inputClass} pl-10 pr-3.5`}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-[13px] font-medium"
              >
                Mot de passe
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--jb-muted)]"
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pl-10 pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                  className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--jb-muted)] transition hover:bg-violet-500/10 hover:text-violet-500 focus-visible:outline-2 focus-visible:outline-violet-500"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-500"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-semibold text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                boxShadow: "0 6px 18px rgba(124, 58, 237, 0.35)",
              }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Connexion en cours" : "Se connecter"}
            </button>
          </form>
      {unverified && (
        <p className="mt-4 text-center text-[13px] text-[var(--jb-muted)]">
          {resent ? (
            "Un nouvel email vient de partir si le compte existe."
          ) : (
            <button
              type="button"
              onClick={resend}
              className="font-medium text-violet-500 hover:underline"
            >
              Renvoyer l'email de confirmation
            </button>
          )}
        </p>
      )}
    </AuthShell>
  );
}
