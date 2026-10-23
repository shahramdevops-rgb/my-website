import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { NavLinks } from "@/components/layout/NavLinks";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import type { Locale } from "@/lib/i18n/config";
import { Link } from "@/lib/i18n/navigation";
import { mainNav, type NavItem } from "@/lib/site/navigation";

/**
 * Site header: name (→ Home), the main navigation (inline from `lg`, in MobileMenu below), the language switcher
 * and the theme toggle. The view-transition-name classes mark the parts the fa ↔ en switch slides to their
 * mirrored places (globals.css); each name must exist once per page, so the mobile panel has none.
 */
export async function SiteHeader({ locale, siteName }: { locale: Locale; siteName: string }) {
  const t = await getTranslations();
  const items: NavItem[] = mainNav.map((item) => ({
    href: item.href,
    label: t(`nav.${item.key}`),
  }));

  return (
    <header className="sticky top-0 print:hidden z-40 border-b border-border bg-bg/85 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link
          href="/"
          className="shrink-0 text-base font-bold text-text [view-transition-name:site-brand]"
        >
          {siteName}
        </Link>

        <nav
          aria-label={t("nav.label")}
          className="hidden [view-transition-name:site-nav] lg:block"
        >
          <NavLinks items={items} />
        </nav>

        <div className="ms-auto flex items-center gap-2 [view-transition-name:site-actions]">
          <LanguageSwitcher locale={locale} label={t("language.other")} />
          <ThemeToggle label={t("theme.dark")} />
          <MobileMenu label={t("nav.menu")}>
            <nav aria-label={t("nav.label")}>
              <NavLinks items={items} vertical />
            </nav>
          </MobileMenu>
        </div>
      </div>
    </header>
  );
}
