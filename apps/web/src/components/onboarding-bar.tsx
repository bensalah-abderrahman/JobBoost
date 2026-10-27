"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Check, X } from "lucide-react";

type Step = {
  id: string;
  label: string;
  hint: string;
  href: string;
  done: boolean;
};

type Progress = {
  steps: Step[];
  percent: number;
  complete: boolean;
  next: string | null;
};

const DISMISS_KEY = "jobboost-onboarding-dismissed";

/**
 * Barre « Pour commencer » : montre où en est l'utilisateur et lui
 * propose toujours une seule action suivante. Disparaît une fois
 * toutes les étapes faites.
 */
export default function OnboardingBar() {
  const pathname = usePathname();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      // Stockage indisponible : la barre reste affichée.
    }
  }, []);

  // Recalculé à chaque changement de page : les étapes se cochent seules.
  useEffect(() => {
    fetch("/api/onboarding")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setProgress(data))
      .catch(() => undefined);
  }, [pathname]);

  if (!progress || progress.complete || hidden) {
    return null;
  }

  const next = progress.steps.find((step) => step.id === progress.next);

  function dismiss() {
    setHidden(true);

    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Sans stockage, la barre reviendra au prochain chargement.
    }
  }

  return (
    <section
      aria-label="Pour commencer"
      className="mb-6 rounded-2xl border border-[var(--jb-border)] bg-[var(--jb-surface)] p-4"
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="min-w-[180px]">
          <p className="text-[14px] font-semibold">Pour commencer</p>
          <p className="text-[12px] text-[var(--jb-muted)]">
            {progress.percent}% terminé
          </p>
        </div>

        <ol className="flex flex-1 flex-wrap items-center gap-2">
          {progress.steps.map((step, index) => {
            const current = step.id === progress.next;

            return (
              <li key={step.id}>
                <Link
                  href={step.href}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] transition ${
                    step.done
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                      : current
                        ? "border-violet-500/50 bg-violet-500/10 font-medium text-violet-600"
                        : "border-[var(--jb-border)] text-[var(--jb-muted)]"
                  }`}
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold">
                    {step.done ? <Check size={13} strokeWidth={3} /> : index + 1}
                  </span>
                  {step.label}
                </Link>
              </li>
            );
          })}
        </ol>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Masquer"
          className="rounded-lg p-1.5 text-[var(--jb-muted)] transition hover:bg-violet-500/10 hover:text-violet-500"
        >
          <X size={16} />
        </button>
      </div>

      {next && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--jb-border)] pt-3">
          <p className="text-[13px] text-[var(--jb-muted)]">{next.hint}</p>
          <Link
            href={next.href}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold text-white transition hover:brightness-110"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
          >
            {next.label}
            <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </section>
  );
}
