import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API = process.env.INTERNAL_API_URL ?? "http://localhost:8080";

export async function proxy(request: NextRequest) {
  const cookie = request.headers.get("cookie");

  if (cookie?.includes("jb_session=")) {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { cookie },
        cache: "no-store",
      });

      if (res.ok) {
        return NextResponse.next();
      }
    } catch {
      // API injoignable : on renvoie vers la connexion.
    }
  }

  const login = new URL("/login", request.url);

  if (request.nextUrl.pathname !== "/") {
    login.searchParams.set("next", request.nextUrl.pathname);
  }

  const response = NextResponse.redirect(login);
  response.cookies.delete("jb_session");

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|login|register|verify|favicon.ico|.*\\..*).*)"],
};
