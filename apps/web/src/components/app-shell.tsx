'use client';
import LogoutButton from './logout-button';
import OnboardingBar from './onboarding-bar';

import {
  BriefcaseBusiness,
  ChevronRight,
  FileCheck2,
  LayoutDashboard,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Sun,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  type ReactNode,
  type CSSProperties,
  useEffect,
  useState,
} from 'react';

// ============================================================
// TYPES
// ============================================================

type AppShellProps = {
  children: ReactNode;
};

type NavigationItem = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

// ============================================================
// NAVIGATION
// ============================================================

const navigation: NavigationItem[] = [
  {
    label: "Vue d'ensemble",
    description: 'Activité & performance',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: "Offres d'emploi",
    description: 'Recherche & matching IA',
    href: '/jobs',
    icon: BriefcaseBusiness,
  },
  {
    label: 'Candidatures',
    description: 'Suivi, envoi & relances',
    href: '/applications',
    icon: FileCheck2,
  },
  {
    label: 'Profil candidat',
    description: 'Parcours & compétences',
    href: '/profile',
    icon: UserRound,
  },
];

// ============================================================
// PAGE INFO
// ============================================================

function getPageInfo(
  pathname: string,
) {
  if (
    pathname.startsWith(
      '/dashboard',
    )
  ) {
    return {
      section: 'JobBoost',
      title: "Vue d'ensemble",
      description:
        'Activité et performances',
    };
  }

  if (
    pathname.startsWith(
      '/jobs',
    )
  ) {
    return {
      section: 'Recherche',
      title: "Offres d'emploi",
      description:
        'Recherche et matching IA',
    };
  }

  if (
    pathname.startsWith(
      '/applications',
    )
  ) {
    return {
      section: 'Suivi',
      title: 'Candidatures',
      description:
        'Suivi, envoi et relances',
    };
  }

  if (
    pathname.startsWith(
      '/profile',
    )
  ) {
    return {
      section: 'Candidat',
      title: 'Profil candidat',
      description:
        'Parcours et compétences',
    };
  }

  if (
    pathname.startsWith(
      '/resume',
    )
  ) {
    return {
      section: 'Documents',
      title: 'CV personnalisé',
      description:
        'CV généré pour une offre',
    };
  }

  if (
    pathname.startsWith(
      '/cover-letter',
    )
  ) {
    return {
      section: 'Documents',
      title:
        'Lettre de motivation',
      description:
        'Lettre générée par JobBoost',
    };
  }

  return {
    section: 'JobBoost',
    title: 'JobBoost AI',
    description:
      'Assistant carrière intelligent',
  };
}

// ============================================================
// BRAND LOGO
// ============================================================

function BrandLogo({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <div
      className={`
        relative
        flex shrink-0
        items-center
        justify-center
        overflow-hidden
        bg-gradient-to-br
        from-violet-500
        via-purple-500
        to-fuchsia-500
        text-white
        ring-1
        ring-white/20
        shadow-[0_8px_25px_rgba(168,85,247,.28)]

        ${
          compact
            ? 'h-9 w-9 rounded-[11px]'
            : 'h-10 w-10 rounded-[13px]'
        }
      `}
    >
      <BriefcaseBusiness
        size={
          compact
            ? 17
            : 19
        }
        strokeWidth={2.1}
      />

      <span
        className="
          absolute
          right-[3px]
          top-[3px]
          flex h-[14px] w-[14px]
          items-center
          justify-center
          rounded-full
          border border-white/20
          bg-white/20
          backdrop-blur-sm
        "
      >
        <Sparkles
          size={8}
          strokeWidth={2.6}
        />
      </span>

      <span
        className="
          pointer-events-none
          absolute inset-0
          bg-gradient-to-br
          from-white/15
          to-transparent
        "
      />
    </div>
  );
}

// ============================================================
// APP SHELL
// ============================================================

export default function AppShell({
  children,
}: AppShellProps) {
  const pathname =
    usePathname();

  const [
    darkMode,
    setDarkMode,
  ] = useState(false);

  const [
    collapsed,
    setCollapsed,
  ] = useState(false);

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  // ============================================================
  // INITIAL SETTINGS
  // ============================================================

  useEffect(() => {
    const storedTheme =
      localStorage.getItem(
        'jobboost-theme',
      );

    const shouldUseDark =
      storedTheme === 'dark' ||
      (
        !storedTheme &&
        window.matchMedia(
          '(prefers-color-scheme: dark)',
        ).matches
      );

    setDarkMode(
      shouldUseDark,
    );

    document.documentElement
      .classList.toggle(
        'dark',
        shouldUseDark,
      );

    const storedCollapsed =
      localStorage.getItem(
        'jobboost-sidebar-collapsed',
      );

    setCollapsed(
      storedCollapsed ===
        'true',
    );
  }, []);

  // ============================================================
  // CLOSE MOBILE MENU ON NAVIGATION
  // ============================================================

  useEffect(() => {
    setMobileOpen(
      false,
    );
  }, [pathname]);

  // ============================================================
  // THEME
  // ============================================================

  function toggleTheme() {
    const next =
      !darkMode;

    setDarkMode(
      next,
    );

    document.documentElement
      .classList.toggle(
        'dark',
        next,
      );

    localStorage.setItem(
      'jobboost-theme',
      next
        ? 'dark'
        : 'light',
    );
  }

  // ============================================================
  // SIDEBAR
  // ============================================================

  function toggleSidebar() {
    const next =
      !collapsed;

    setCollapsed(
      next,
    );

    localStorage.setItem(
      'jobboost-sidebar-collapsed',
      String(next),
    );
  }

  const page =
    getPageInfo(
      pathname,
    );

  return (
    <div
    className="app-shell"
    style={
      {
        '--sidebar-width':
          collapsed
            ? '84px'
            : '252px',
      } as CSSProperties
    }
  >

      {/* ====================================================== */}
      {/* DESKTOP SIDEBAR */}
      {/* ====================================================== */}

    <aside
  className="
    app-sidebar
    hidden lg:flex
  "
>

        {/* BRAND */}

        <div
          className={`
            flex h-[68px]
            shrink-0
            items-center
            border-b
            border-white/[0.07]

            ${
              collapsed
                ? 'justify-center px-3'
                : 'px-4'
            }
          `}
        >
          <Link
            href="/dashboard"
            className="
              group
              flex min-w-0
              items-center
              gap-3
            "
          >
            <BrandLogo />

            {!collapsed && (
              <div className="min-w-0">

                <div className="flex items-center gap-2">

                  <p
                    className="
                      truncate
                      text-[15px]
                      font-bold
                      tracking-[-0.02em]
                      text-white
                    "
                  >
                    JobBoost
                  </p>

                  <span
                    className="
                      rounded-[5px]
                      border
                      border-violet-300/20
                      bg-violet-300/10
                      px-1.5
                      py-[2px]
                      text-[8px]
                      font-extrabold
                      uppercase
                      tracking-[0.14em]
                      text-violet-200
                    "
                  >
                    AI
                  </span>

                </div>

                <p
                  className="
                    mt-[2px]
                    truncate
                    text-[10px]
                    font-medium
                    text-violet-200/50
                  "
                >
                  Assistant carrière
                </p>

              </div>
            )}
          </Link>
        </div>

        {/* NAVIGATION */}

        <div
          className="
            flex-1
            overflow-y-auto
            px-3
            py-5
          "
        >

          {!collapsed && (
            <p
              className="
                mb-3
                px-3
                text-[9px]
                font-bold
                uppercase
                tracking-[0.22em]
                text-violet-200/35
              "
            >
              Navigation
            </p>
          )}

          <nav className="space-y-1.5">

            {navigation.map(
              (
                item,
              ) => {
                const Icon =
                  item.icon;

                const active =
                  pathname ===
                    item.href ||
                  pathname.startsWith(
                    `${item.href}/`,
                  );

                return (
                  <Link
                    key={
                      item.href
                    }
                    href={
                      item.href
                    }
                    title={
                      collapsed
                        ? item.label
                        : undefined
                    }
                    className={`
                      group/nav
                      relative
                      flex min-h-[52px]
                      items-center
                      overflow-hidden
                      rounded-[13px]
                      border
                      transition-all
                      duration-200

                      ${
                        collapsed
                          ? 'justify-center px-2'
                          : 'gap-3 px-3'
                      }

                      ${
                        active
                          ? `
                            border-violet-300/15
                            bg-violet-400/[0.12]
                            text-white
                            shadow-[0_8px_24px_rgba(88,28,135,.18)]
                          `
                          : `
                            border-transparent
                            text-violet-100/60
                            hover:border-white/[0.05]
                            hover:bg-white/[0.055]
                            hover:text-white
                          `
                      }
                    `}
                  >

                    {active && (
                      <span
                        className="
                          absolute
                          left-0
                          h-7
                          w-[3px]
                          rounded-r-full
                          bg-fuchsia-400
                          shadow-[0_0_14px_rgba(232,121,249,.55)]
                        "
                      />
                    )}

                    <div
                      className={`
                        flex h-8 w-8
                        shrink-0
                        items-center
                        justify-center
                        rounded-[9px]
                        transition-all

                        ${
                          active
                            ? `
                              bg-violet-300/10
                              text-violet-200
                            `
                            : `
                              text-violet-200/45
                              group-hover/nav:bg-white/[0.05]
                              group-hover/nav:text-violet-100
                            `
                        }
                      `}
                    >
                      <Icon
                        size={17}
                        strokeWidth={
                          active
                            ? 2.25
                            : 1.9
                        }
                      />
                    </div>

                    {!collapsed && (
                      <>
                        <div className="min-w-0 flex-1">

                          <p
                            className={`
                              truncate
                              text-[12px]
                              font-semibold
                              tracking-[-0.01em]

                              ${
                                active
                                  ? 'text-white'
                                  : 'text-violet-50/80'
                              }
                            `}
                          >
                            {
                              item.label
                            }
                          </p>

                          <p
                            className={`
                              mt-[2px]
                              truncate
                              text-[9px]

                              ${
                                active
                                  ? 'text-violet-200/60'
                                  : 'text-violet-200/30'
                              }
                            `}
                          >
                            {
                              item.description
                            }
                          </p>

                        </div>

                        <ChevronRight
                          size={14}
                          strokeWidth={2}
                          className={`
                            transition-transform

                            ${
                              active
                                ? 'text-violet-300'
                                : 'text-violet-300/25 group-hover/nav:translate-x-0.5 group-hover/nav:text-violet-200/60'
                            }
                          `}
                        />
                      </>
                    )}

                  </Link>
                );
              },
            )}

          </nav>
        </div>

        {/* BOTTOM */}

        <div
          className="
            shrink-0
            border-t
            border-white/[0.07]
            p-3
          "
        >

          {!collapsed && (
            <Link
              href="/profile"
              className="
                mb-2
                flex items-center
                gap-3
                rounded-xl
                border
                border-violet-300/[0.08]
                bg-white/[0.025]
                p-2.5
                transition
                hover:bg-white/[0.05]
              "
            >
              <div
                className="
                  flex h-9 w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-[10px]
                  bg-gradient-to-br
                  from-violet-500
                  to-fuchsia-500
                  text-[10px]
                  font-bold
                  text-white
                  shadow-[0_6px_18px_rgba(168,85,247,.22)]
                  ring-1
                  ring-white/10
                "
              >
                AB
              </div>

              <div className="min-w-0 flex-1">

                <p
                  className="
                    truncate
                    text-[11px]
                    font-semibold
                    text-violet-50/90
                  "
                >
                  Abderrahmane
                </p>

                <p
                  className="
                    mt-[1px]
                    text-[9px]
                    text-violet-200/35
                  "
                >
                  Profil candidat
                </p>

              </div>

              <ChevronRight
                size={13}
                className="text-violet-300/25"
              />
            </Link>
          )}

          <button
            type="button"
            onClick={
              toggleSidebar
            }
            className={`
              flex h-10 w-full
              items-center
              rounded-[11px]
              text-violet-200/35
              transition-all

              hover:bg-white/[0.05]
              hover:text-violet-100

              ${
                collapsed
                  ? 'justify-center'
                  : 'gap-3 px-3'
              }
            `}
          >
            {collapsed ? (
              <PanelLeftOpen
                size={17}
              />
            ) : (
              <>
                <PanelLeftClose
                  size={17}
                />

                <span
                  className="
                    text-[10px]
                    font-medium
                  "
                >
                  Réduire la navigation
                </span>
              </>
            )}
          </button>

        </div>
      </aside>

      {/* ====================================================== */}
      {/* MOBILE */}
      {/* ====================================================== */}

      {mobileOpen && (
        <div
          className="
            fixed inset-0
            z-[100]
            lg:hidden
          "
        >

          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() =>
              setMobileOpen(
                false,
              )
            }
            className="
              absolute inset-0
              bg-purple-950/55
              backdrop-blur-[3px]
            "
          />

          <aside
            className="
              app-mobile-sidebar
              relative z-10
              flex h-full
              w-[286px]
              flex-col
              shadow-2xl
            "
          >

            <div
              className="
                flex h-[68px]
                shrink-0
                items-center
                justify-between
                border-b
                border-white/[0.07]
                px-4
              "
            >

              <Link
                href="/dashboard"
                className="flex items-center gap-3"
              >
                <BrandLogo />

                <div>

                  <div className="flex items-center gap-2">

                    <p
                      className="
                        text-sm
                        font-bold
                        text-white
                      "
                    >
                      JobBoost
                    </p>

                    <span
                      className="
                        rounded
                        bg-violet-300/10
                        px-1
                        py-[1px]
                        text-[8px]
                        font-bold
                        text-violet-200
                      "
                    >
                      AI
                    </span>

                  </div>

                  <p
                    className="
                      mt-[2px]
                      text-[10px]
                      text-violet-200/40
                    "
                  >
                    Assistant carrière
                  </p>

                </div>
              </Link>

              <button
                type="button"
                onClick={() =>
                  setMobileOpen(
                    false,
                  )
                }
                className="
                  flex h-9 w-9
                  items-center
                  justify-center
                  rounded-[10px]
                  text-violet-200/45
                  transition
                  hover:bg-white/[0.06]
                  hover:text-white
                "
              >
                <X
                  size={18}
                />
              </button>

            </div>

            <div className="flex-1 overflow-y-auto p-4">

              <p
                className="
                  mb-3
                  px-2
                  text-[9px]
                  font-bold
                  uppercase
                  tracking-[0.22em]
                  text-violet-200/30
                "
              >
                Navigation
              </p>

              <nav className="space-y-2">

                {navigation.map(
                  (
                    item,
                  ) => {
                    const Icon =
                      item.icon;

                    const active =
                      pathname ===
                        item.href ||
                      pathname.startsWith(
                        `${item.href}/`,
                      );

                    return (
                      <Link
                        key={
                          item.href
                        }
                        href={
                          item.href
                        }
                        className={`
                          flex items-center
                          gap-3
                          rounded-[13px]
                          border
                          px-3 py-3
                          transition

                          ${
                            active
                              ? `
                                border-violet-300/15
                                bg-violet-400/[0.12]
                              `
                              : `
                                border-transparent
                                hover:bg-white/[0.05]
                              `
                          }
                        `}
                      >

                        <div
                          className={`
                            flex h-8 w-8
                            items-center
                            justify-center
                            rounded-[9px]

                            ${
                              active
                                ? 'bg-violet-300/10 text-violet-200'
                                : 'text-violet-200/45'
                            }
                          `}
                        >
                          <Icon
                            size={17}
                          />
                        </div>

                        <div className="min-w-0 flex-1">

                          <p
                            className={`
                              text-[12px]
                              font-semibold

                              ${
                                active
                                  ? 'text-white'
                                  : 'text-violet-50/80'
                              }
                            `}
                          >
                            {
                              item.label
                            }
                          </p>

                          <p
                            className={`
                              mt-[2px]
                              text-[9px]

                              ${
                                active
                                  ? 'text-violet-200/60'
                                  : 'text-violet-200/30'
                              }
                            `}
                          >
                            {
                              item.description
                            }
                          </p>

                        </div>

                        <ChevronRight
                          size={14}
                          className={
                            active
                              ? 'text-violet-300'
                              : 'text-violet-300/25'
                          }
                        />

                      </Link>
                    );
                  },
                )}

              </nav>
            </div>

          </aside>
        </div>
      )}

      {/* ====================================================== */}
      {/* MAIN */}
      {/* ====================================================== */}

      <div className="app-main">

        {/* TOPBAR */}

       <header className="app-topbar">
          <div
            className="
              mx-auto
              flex h-full
              max-w-[1700px]
              items-center
              justify-between
              gap-5
              px-4
              sm:px-6
              lg:px-8
            "
          >

            {/* LEFT */}

            <div
              className="
                flex min-w-0
                items-center
                gap-3
              "
            >

              <button
                type="button"
                onClick={() =>
                  setMobileOpen(
                    true,
                  )
                }
                className="
                  app-icon-button
                  flex lg:hidden
                "
              >
                <Menu
                  size={18}
                />
              </button>

              <div className="min-w-0">

                <div
                  className="
                    flex min-w-0
                    items-center
                    gap-2
                  "
                >

                  <span
                    className="
                      hidden
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-[0.13em]
                      text-violet-500
                      sm:inline
                    "
                  >
                    {
                      page.section
                    }
                  </span>

                  <ChevronRight
                    size={12}
                    className="
                      hidden
                      text-gray-300
                      sm:block
                    "
                  />

                  <p
                    className="
                      truncate
                      text-[13px]
                      font-semibold
                      text-gray-900
                      dark-theme-title
                    "
                  >
                    {
                      page.title
                    }
                  </p>

                  <span
                    className="
                      hidden
                      text-gray-300
                      md:inline
                    "
                  >
                    /
                  </span>

                  <p
                    className="
                      hidden
                      truncate
                      text-[11px]
                      text-gray-400
                      md:block
                    "
                  >
                    {
                      page.description
                    }
                  </p>

                </div>

              </div>
            </div>

            {/* RIGHT */}

            <div
              className="
                flex shrink-0
                items-center
                gap-2
              "
            >

              {/* API */}

              <div
                className="
                  hidden
                  items-center
                  gap-2
                  rounded-full
                  border
                  border-gray-200
                  bg-white/80
                  px-3
                  py-[7px]
                  text-[10px]
                  font-medium
                  text-gray-500
                  shadow-sm
                  backdrop-blur
                  md:flex
                "
              >
                <span className="relative flex h-[7px] w-[7px]">

                  <span
                    className="
                      absolute
                      inline-flex
                      h-full w-full
                      animate-ping
                      rounded-full
                      bg-emerald-400
                      opacity-40
                    "
                  />

                  <span
                    className="
                      relative
                      inline-flex
                      h-[7px] w-[7px]
                      rounded-full
                      bg-emerald-500
                    "
                  />

                </span>

                Système opérationnel
              </div>

              {/* THEME */}

              <button
                type="button"
                onClick={
                  toggleTheme
                }
                className="app-theme-toggle"
                title={
                  darkMode
                    ? 'Passer en mode clair'
                    : 'Passer en mode sombre'
                }
              >

                <Sun
                  size={14}
                  className={
                    darkMode
                      ? 'text-gray-400'
                      : 'text-amber-500'
                  }
                />

                <span className="h-4 w-px bg-gray-200" />

                <Moon
                  size={14}
                  className={
                    darkMode
                      ? 'text-violet-400'
                      : 'text-gray-400'
                  }
                />

              </button>

              <LogoutButton />

              {/* SEPARATOR */}

              <div
                className="
                  hidden
                  h-6 w-px
                  bg-gray-200
                  sm:block
                "
              />

              {/* PROFILE */}

              <Link
                href="/profile"
                className="
                  flex items-center
                  gap-2
                  rounded-[11px]
                  p-1
                  transition
                  hover:bg-gray-100
                "
              >

                <div
                  className="
                    flex h-9 w-9
                    shrink-0
                    items-center
                    justify-center
                    rounded-[10px]
                    bg-gradient-to-br
                    from-violet-500
                    to-fuchsia-500
                    text-[10px]
                    font-bold
                    text-white
                    shadow-[0_5px_15px_rgba(168,85,247,.2)]
                    ring-1
                    ring-black/5
                  "
                >
                  AB
                </div>

                <div
                  className="
                    hidden
                    min-w-0
                    pr-1
                    text-left
                    xl:block
                  "
                >
                  <p
                    className="
                      truncate
                      text-[10px]
                      font-semibold
                      text-gray-800
                    "
                  >
                    Abderrahmane
                  </p>

                  <p
                    className="
                      mt-[1px]
                      text-[9px]
                      text-gray-400
                    "
                  >
                    Mon compte
                  </p>
                </div>

              </Link>

            </div>
          </div>
        </header>

        {/* PAGE */}

        <div className="app-content">
          <OnboardingBar />
          {
            children
          }
        </div>

      </div>
    </div>
  );
}