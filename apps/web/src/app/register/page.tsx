"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail, MailCheck, User } from "lucide-react";
import AuthShell from "../../components/auth-shell";
import SocialButtons from "../../components/social-buttons";

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--jb-border)] bg-transparent text-[14px] text-[var(--jb-text)] outline-none transition placeholder:text-[var(--jb-muted)] focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15";

const buttonStyle = {
  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
  boxShadow: "0 6px 18px rgba(124, 58, 237, 0.35)",
};

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const passwordLongEnough = password.length >= 12;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const message = Array.isArray(body?.message)
          ? body.message[0]
          : body?.message;

        setError(
          typeof message === "string"
            ? message
            : "Inscription impossible. Réessayez.",
        );
        return;
      }

      setDone(true);
    } catch {
      setError("Le serveur ne répond pas. Réessayez dans un instant.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <AuthShell
        title="Vérifiez votre boîte mail"
        subtitle="Une dernière étape avant de commencer."
        footer={
          <Link href="/login" className="font-medium text-violet-500 hover:underline">
            Retour à la connexion
          </Link>
        }
      >
        <div className="mt-5 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 text-violet-500">
            <MailCheck size={22} />
          </div>
          <p className="mt-4 text-[14px] leading-relaxed">
            Si l'adresse <strong>{email}</strong> peut être utilisée, un lien de
            confirmation vient de lui être envoyé. Il est valable 24 heures.
          </p>
          <p className="mt-3 text-[13px] text-[var(--jb-muted)]">
            Rien reçu ? Regardez dans les courriers indésirables.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Votre espace de candidatures, privé et personnel."
      footer={
        <>
          Déjà inscrit ?{" "}
          <Link href="/login" className="font-medium text-violet-500 hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <SocialButtons verb="S'inscrire" />

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="mb-1.5 block text-[13px] font-medium">
              Prénom
            </label>
            <div className="relative">
              <User
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--jb-muted)]"
              />
              <input
                id="firstName"
                required
                autoFocus
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={`${inputClass} pl-10 pr-3`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="lastName" className="mb-1.5 block text-[13px] font-medium">
              Nom
            </label>
            <input
              id="lastName"
              required
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={`${inputClass} px-3.5`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium">
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
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
              className={`${inputClass} pl-10 pr-3.5`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium">
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pl-10 pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--jb-muted)] transition hover:bg-violet-500/10 hover:text-violet-500 focus-visible:outline-2 focus-visible:outline-violet-500"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p
            className={`mt-1.5 text-[12px] ${
              passwordLongEnough ? "text-emerald-500" : "text-[var(--jb-muted)]"
            }`}
          >
            12 caractères minimum ({password.length}/12)
          </p>
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
          disabled={
            loading || !firstName || !lastName || !email || !passwordLongEnough
          }
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-semibold text-white transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          style={buttonStyle}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Création en cours" : "Créer mon compte"}
        </button>
      </form>
    </AuthShell>
  );
}
