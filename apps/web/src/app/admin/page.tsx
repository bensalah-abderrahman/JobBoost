"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Play, ShieldCheck, Trash2 } from "lucide-react";

type AdminUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  canCollect: boolean;
  canSendEmail: boolean;
  credits: number;
  disabledAt: string | null;
  emailVerifiedAt: string | null;
  createdAt: string;
  jobsCount: number;
  applicationsCount: number;
};

const card =
  "rounded-2xl border border-[var(--jb-border)] bg-[var(--jb-surface)]";

function Toggle({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? "bg-violet-600" : "bg-[var(--jb-border)]"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users");

    if (res.status === 403) {
      setError("Accès réservé à l'administrateur.");
      return;
    }

    if (!res.ok) {
      setError("Impossible de charger les utilisateurs.");
      return;
    }

    setUsers(await res.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function call(
    id: string,
    request: () => Promise<Response>,
    success: string,
  ) {
    setBusy(id);
    setNotice(null);
    setError(null);

    try {
      const res = await request();
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setError(
          typeof body?.message === "string" ? body.message : "Action refusée.",
        );
        return;
      }

      setNotice(success);
      await load();
    } catch {
      setError("Le serveur ne répond pas.");
    } finally {
      setBusy(null);
      setConfirmId(null);
    }
  }

  const patch = (user: AdminUser, change: Record<string, unknown>, ok: string) =>
    call(
      user.id,
      () =>
        fetch(`/api/admin/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(change),
        }),
      ok,
    );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <ShieldCheck size={22} className="text-violet-500" />
        <div>
          <h1 className="text-[20px] font-semibold">Administration</h1>
          <p className="text-[13px] text-[var(--jb-muted)]">
            Phase de test : vous décidez de ce que chaque compte peut faire.
          </p>
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
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-[13px] text-emerald-500"
        >
          {notice}
        </p>
      )}

      <p className="text-[12px] text-[var(--jb-muted)]">
        « Envoi d&apos;emails » fait partir les messages depuis votre propre
        boîte SMTP : n&apos;accordez cette autorisation qu&apos;aux comptes de
        confiance.
      </p>

      {!users && !error && (
        <p className="flex items-center gap-2 text-[13px] text-[var(--jb-muted)]">
          <Loader2 size={14} className="animate-spin" /> Chargement
        </p>
      )}

      <ul className="space-y-3">
        {users?.map((user) => {
          const isAdmin = user.role === "ADMIN";
          const disabled = Boolean(user.disabledAt);
          const working = busy === user.id;
          const name = [user.firstName, user.lastName].filter(Boolean).join(" ");

          return (
            <li key={user.id} className={`${card} p-4`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">
                    {name || user.email}
                    {isAdmin && (
                      <span className="ml-2 rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] text-violet-500">
                        Admin
                      </span>
                    )}
                    {disabled && (
                      <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] text-red-500">
                        Désactivé
                      </span>
                    )}
                    {!user.emailVerifiedAt && (
                      <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-500">
                        Email non confirmé
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[12px] text-[var(--jb-muted)]">
                    {user.email} · {user.jobsCount} offres ·{" "}
                    {user.applicationsCount} candidatures · inscrit le{" "}
                    {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>

                {working && (
                  <Loader2 size={16} className="animate-spin text-violet-500" />
                )}
              </div>

              {!isAdmin && (
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px]">
                  <label className="flex items-center gap-2">
                    <Toggle
                      label="Collecte France Travail"
                      checked={user.canCollect}
                      disabled={working}
                      onChange={(value) =>
                        patch(user, { canCollect: value }, "Autorisation mise à jour.")
                      }
                    />
                    Collecte France Travail
                  </label>

                  <label className="flex items-center gap-2">
                    <Toggle
                      label="Envoi d'emails"
                      checked={user.canSendEmail}
                      disabled={working}
                      onChange={(value) =>
                        patch(user, { canSendEmail: value }, "Autorisation mise à jour.")
                      }
                    />
                    Envoi d&apos;emails
                  </label>

                  <label className="flex items-center gap-2">
                    <Toggle
                      label="Compte actif"
                      checked={!disabled}
                      disabled={working}
                      onChange={(value) =>
                        patch(
                          user,
                          { disabled: !value },
                          value ? "Compte réactivé." : "Compte désactivé.",
                        )
                      }
                    />
                    Compte actif
                  </label>
                </div>
              )}

              {!isAdmin && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={working || disabled}
                    onClick={() =>
                      call(
                        user.id,
                        () =>
                          fetch(`/api/admin/users/${user.id}/collect`, {
                            method: "POST",
                          }),
                        `Collecte lancée pour ${user.email}. Les offres arrivent dans son compte.`,
                      )
                    }
                    className="flex h-9 items-center gap-2 rounded-xl border border-[var(--jb-border)] px-3 text-[13px] font-medium transition hover:border-violet-500 hover:text-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Play size={14} /> Lancer la collecte pour lui
                  </button>

                  {confirmId === user.id ? (
                    <>
                      <button
                        type="button"
                        disabled={working}
                        onClick={() =>
                          call(
                            user.id,
                            () =>
                              fetch(`/api/admin/users/${user.id}`, {
                                method: "DELETE",
                              }),
                            "Compte supprimé avec toutes ses données.",
                          )
                        }
                        className="h-9 rounded-xl bg-red-600 px-3 text-[13px] font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                      >
                        Confirmer la suppression définitive
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="h-9 rounded-xl px-3 text-[13px] text-[var(--jb-muted)] hover:text-[var(--jb-text)]"
                      >
                        Annuler
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => setConfirmId(user.id)}
                      className="flex h-9 items-center gap-2 rounded-xl px-3 text-[13px] text-red-500 transition hover:bg-red-500/10 disabled:opacity-40"
                    >
                      <Trash2 size={14} /> Supprimer le compte
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
