import type { ReactNode } from "react";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { fontVariables } from "@/lib/fonts";
import { type Locale, textDirection } from "@/lib/i18n/config";

/**
 * The <html> shell shared by the locale layout and the 404 page: language and direction, font variables, and the
 * theme script that runs before the first paint. suppressHydrationWarning on <html>: that script may add
 * data-theme="light" before React hydrates, which React would otherwise report as a mismatch.
 */
export function HtmlDocument({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <html
      lang={locale}
      dir={textDirection(locale)}
      className={fontVariables}
      suppressHydrationWarning
    >
      {/* The rule is for the Pages Router (next/head); in the App Router a root layout writes <head> itself.
          It only recognises files under app/, and this one lives in components/. */}
      {/* eslint-disable-next-line @next/next/no-head-element */}
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
