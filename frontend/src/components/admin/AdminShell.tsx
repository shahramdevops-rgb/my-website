import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { mainContentId, SkipLink } from "@/components/layout/SkipLink";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { adminNav, type AdminNavItem } from "@/lib/admin/navigation";
import type { Locale } from "@/lib/i18n/config";
import { AdminLanguageButton } from "./AdminLanguageButton";
import { AdminNav } from "./AdminNav";
import { LogoutButton } from "./LogoutButton";

/**
 * The panel's frame (P5-T5): a sidebar from `lg` (the same links in a menu below it), a top bar with the account
 * and the switches, and the page. Server Component: only the leaves that need the browser (nav state, theme,
 * language, logout) are client code.
 */
export async function AdminShell({
  email,
  locale,
  children,
}: {
  email: string;
  locale: Locale;
  children: ReactNode;
}) {
  const t = await getTranslations("admin");
  const tTheme = await getTranslations("theme");
  const items: AdminNavItem[] = adminNav.map((item) => ({
    href: item.href,
    ready: item.ready,
    label: t(`nav.${item.key}`),
  }));
  const nav = <AdminNav items={items} soonLabel={t("nav.soon")} />;
  const signedInAs = t("shell.signedInAs", { email });

  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:flex-row">
      <SkipLink />

      <aside className="hidden w-60 shrink-0 flex-col gap-6 border-e border-border bg-surface px-3 py-5 lg:flex">
        <Link href="/admin" className="px-3 text-base font-bold text-text">
          {t("brand")}
        </Link>
        <nav aria-label={t("nav.label")}>{nav}</nav>
        {/* A plain link: the public site is another root layout (with its language prefix), so a full page load. */}
        <a href={`/${locale}`} className="mt-auto px-3 text-sm text-muted hover:text-text">
          {t("shell.viewSite")}
        </a>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur">
          <div className="relative flex h-16 items-center gap-2 px-4 lg:px-8">
            <Link
              href="/admin"
              className="shrink-0 whitespace-nowrap text-base font-bold text-text lg:hidden"
            >
              {t("brand")}
            </Link>
            <p className="hidden truncate text-sm text-muted lg:block">{signedInAs}</p>
            <div className="ms-auto flex items-center gap-2">
              <AdminLanguageButton locale={locale} label={t("shell.language")} />
              <ThemeToggle label={tTheme("dark")} />
              {/* Below lg the header has no room for it: it moves into the menu with the account. */}
              <div className="hidden lg:block">
                <LogoutButton />
              </div>
              <MobileMenu label={t("nav.menu")}>
                <nav aria-label={t("nav.label")}>{nav}</nav>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                  <p className="text-sm text-muted">{signedInAs}</p>
                  <LogoutButton />
                </div>
                <a
                  href={`/${locale}`}
                  className="mt-3 block px-3 text-sm text-muted hover:text-text"
                >
                  {t("shell.viewSite")}
                </a>
              </MobileMenu>
            </div>
          </div>
        </header>

        {/* tabIndex -1: the skip link moves focus here (see the public layout). */}
        <main
          id={mainContentId}
          tabIndex={-1}
          className="flex-1 px-4 py-8 focus:outline-none lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
