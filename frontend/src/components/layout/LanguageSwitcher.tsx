"use client";

import { useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";
import { otherLocale, rememberLocale } from "@/lib/i18n/locale-cookie";
import { getPathname, usePathname } from "@/lib/i18n/navigation";

/**
 * Link to the same page (path and query) in the other language; a click also remembers the choice (`lang`
 * cookie). Deliberately a plain <a>, not Next's <Link>: switching language changes <html lang dir> and every
 * message on the page, so a fresh document is the simple correct answer. That full navigation is also what
 * lets the browser animate between the two pages (cross-document View Transitions, see globals.css).
 * `label` is the other language's name in that language ("English" on Persian pages), hence `lang` on the link.
 */
export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const target = otherLocale(locale);
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const href = `${getPathname({ locale: target, href: pathname })}${query ? `?${query}` : ""}`;

  return (
    <a
      href={href}
      hrefLang={target}
      lang={target}
      onClick={() => rememberLocale(target)}
      className="inline-flex h-10 shrink-0 items-center rounded-full border border-border bg-surface px-3 text-sm text-text hover:bg-surface-2 sm:px-4"
    >
      {label}
    </a>
  );
}
