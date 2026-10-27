"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

/**
 * Point d'arrivée après la connexion : envoie l'utilisateur vers la
 * prochaine étape utile (profil tant qu'il est incomplet).
 */
export default function StartPage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/onboarding")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const profileDone = data?.steps?.[0]?.done ?? false;
        const complete = data?.complete ?? false;

        router.replace(
          !profileDone ? "/profile" : complete ? "/dashboard" : "/jobs",
        );
      })
      .catch(() => router.replace("/profile"));
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 size={26} className="animate-spin text-violet-500" />
    </div>
  );
}
