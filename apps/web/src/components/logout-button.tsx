"use client";

import { LogOut } from "lucide-react";

export default function LogoutButton() {
  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="app-theme-toggle"
      title="Se déconnecter"
    >
      <LogOut size={14} />
    </button>
  );
}
