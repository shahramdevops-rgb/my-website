"use client";

import type { Locale } from "@/lib/i18n/config";
import { otherLocale, rememberLocale } from "@/lib/i18n/locale-cookie";

/**
 * The panel's language switch. Admin URLs carry no language, so instead of a link to another URL it stores the
 * choice in the same `lang` cookie the public switcher uses and reloads: the server renders the page again in
 * the other language (and with the other text direction).
 */
export function AdminLanguageButton({ locale, label }: { locale: Locale; label: string }) {
  const target = otherLocale(locale);

  return (
    <button
      type="button"
      lang={target}
      onClick={() => {
        rememberLocale(target);
        window.location.reload();
      }}
      className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm text-text hover:bg-surface-2"
    >
      {label}
    </button>
  );
}
