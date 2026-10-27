import type {
  Metadata,
} from 'next';

import './globals.css';

import ShellGate
  from '../components/shell-gate';

export const metadata:
  Metadata = {
  title:
    'JobBoost AI',

  description:
    'Plateforme intelligente de recherche d’emploi et de candidatures.',
};

const themeScript = `
(function () {
  try {
    var storedTheme =
      localStorage.getItem(
        'jobboost-theme'
      );

    var dark =
      storedTheme === 'dark' ||
      (
        !storedTheme &&
        window.matchMedia(
          '(prefers-color-scheme: dark)'
        ).matches
      );

    document.documentElement
      .classList.toggle(
        'dark',
        dark
      );
  } catch (_) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children:
    React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              themeScript,
          }}
        />
      </head>

      <body>
        <ShellGate>
          {
            children
          }
        </ShellGate>
      </body>
    </html>
  );
}