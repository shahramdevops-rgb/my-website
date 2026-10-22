import { getTranslations } from "next-intl/server";
import { formatYear } from "@/lib/format/date";
import type { Locale } from "@/lib/i18n/config";
import type { SiteInfo } from "@/lib/site/get-site-info";

/**
 * Site footer: copyright with this year in the locale's calendar (fa: ۱۴۰۵, en: 2026) and the contact links the
 * API has configured (`null` = not set, not shown — CLAUDE.md §5: email, GitHub, Telegram only).
 * rel="me" tells crawlers these profiles belong to the site's owner.
 */
export async function SiteFooter({ locale, site }: { locale: Locale; site: SiteInfo }) {
  const t = await getTranslations("footer");
  const { email, gitHub, telegram } = site.social;
  const links = [
    email && { label: t("social.email"), href: `mailto:${email}` },
    gitHub && { label: t("social.gitHub"), href: gitHub },
    telegram && { label: t("social.telegram"), href: telegram },
  ].filter((link) => !!link);

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="[view-transition-name:site-copyright]">
          {t("copyright", { year: formatYear(new Date(), locale), name: site.name[locale] })}
        </p>
        {links.length > 0 && (
          <nav aria-label={t("social.label")} className="[view-transition-name:site-social]">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} rel="me" className="hover:text-text">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </footer>
  );
}
