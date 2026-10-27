import type { NextConfig } from "next";

const apiTarget =
  process.env.INTERNAL_API_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  // Le navigateur ne parle qu'à Next (même origine) : /api/* est
  // relayé vers l'API NestJS. Le cookie de session reste donc
  // first-party et l'API n'a plus besoin d'être exposée.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiTarget}/:path*`,
      },
    ];
  },

  experimental: {
    // Génération PDF / analyse LLM : plus de 30 s par défaut.
    proxyTimeout: 300_000,
  },
};

export default nextConfig;
