import { getTranslations } from "next-intl/server";
import { EmailLink } from "@/components/contact/EmailLink";
import { encodeEmail } from "@/lib/contact/email";
import { formatYear } from "@/lib/format/date";
import type { Locale } from "@/lib/i18n/config";
import { getPathname } from "@/lib/i18n/navigation";
import type { SiteInfo } from "@/lib/site/get-site-info";

const linkClass = "hover:text-text";

/**
 * Site footer: copyright with this year in the locale's calendar (fa: ۱۴۰۵, en: 2026) and the contact links the
 * API has configured (`null` = not set, not shown — CLAUDE.md §5: email, GitHub, Telegram only).
 * rel="me" tells crawlers these profiles belong to the site's owner. The email is an `EmailLink` (obfuscated, as on
 * the contact page): without JavaScript it leads to the contact page instead.
 */
export async function SiteFooter({ locale, site }: { locale: Locale; site: SiteInfo }) {
  const t = await getTranslations("footer");
  const { email, gitHub, telegram } = site.social;
  const links = [
    gitHub && { label: t("social.gitHub"), href: gitHub },
    telegram && { label: t("social.telegram"), href: telegram },
  ].filter((link) => !!link);

  return (
    <footer className="border-t border-border print:hidden">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="[view-transition-name:site-copyright]">
          {t("copyright", { year: formatYear(new Date(), locale), name: site.name[locale] })}
        </p>
        {(email || links.length > 0) && (
          <nav aria-label={t("social.label")} className="[view-transition-name:site-social]">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {email && (
                <li>
                  <EmailLink
                    encoded={encodeEmail(email)}
                    label={t("social.email")}
                    fallbackHref={getPathname({ locale, href: "/contact" })}
                    rel="me"
                    className={linkClass}
                  />
                </li>
              )}
              {links.map((link) => (
                <li key={link.href}>
                  <a href={link.href} rel="me" className={linkClass}>
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
