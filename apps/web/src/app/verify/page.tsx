"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import AuthShell from "../../components/auth-shell";

type State = "loading" | "ok" | "error";

export default function VerifyPage() {
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("");
  // Le lien est à usage unique : une seule requête, même en mode dev.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = new URLSearchParams(window.location.search).get("token");

    if (!token) {
      setState("error");
      setMessage("Lien incomplet. Ouvrez le lien depuis l'email reçu.");
      return;
    }

    fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.ok) {
          setState("ok");
          return;
        }

        const body = await res.json().catch(() => null);
        setState("error");
        setMessage(
          typeof body?.message === "string"
            ? body.message
            : "Confirmation impossible.",
        );
      })
      .catch(() => {
        setState("error");
        setMessage("Le serveur ne répond pas. Réessayez dans un instant.");
      });
  }, []);

  return (
    <AuthShell
      title={
        state === "ok"
          ? "Adresse confirmée"
          : state === "error"
            ? "Confirmation impossible"
            : "Confirmation en cours"
      }
      subtitle={
        state === "ok"
          ? "Votre compte est actif."
          : state === "error"
            ? message
            : "Un instant."
      }
    >
      <div className="mt-6 flex flex-col items-center gap-5">
        {state === "loading" && (
          <Loader2 size={28} className="animate-spin text-violet-500" />
        )}
        {state === "ok" && <CheckCircle2 size={36} className="text-emerald-500" />}
        {state === "error" && <XCircle size={36} className="text-red-500" />}

        {state !== "loading" && (
          <Link
            href="/login"
            className="flex h-11 w-full items-center justify-center rounded-xl text-[14px] font-semibold text-white transition hover:brightness-110"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #a855f7)",
              boxShadow: "0 6px 18px rgba(124, 58, 237, 0.35)",
            }}
          >
            {state === "ok" ? "Se connecter" : "Retour à la connexion"}
          </Link>
        )}
      </div>
    </AuthShell>
  );
}
