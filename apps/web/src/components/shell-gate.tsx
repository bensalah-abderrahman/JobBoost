"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import AppShell from "./app-shell";

export default function ShellGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/register" || pathname === "/verify") {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
