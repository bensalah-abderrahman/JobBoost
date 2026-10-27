"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

/** Lien vers la console d'administration, visible uniquement pour l'admin. */
export default function AdminLink() {
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setAdmin(body?.user?.role === "ADMIN"))
      .catch(() => setAdmin(false));
  }, []);

  if (!admin) {
    return null;
  }

  return (
    <Link
      href="/admin"
      className="app-theme-toggle"
      title="Administration"
      aria-label="Administration"
    >
      <ShieldCheck size={14} />
    </Link>
  );
}
