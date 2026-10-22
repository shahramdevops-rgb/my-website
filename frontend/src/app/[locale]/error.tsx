"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

/**
 * Shown when a page throws (error boundaries are Client Components). It replaces only the page: the header and
 * footer of the [locale] layout stay. In production Next hides server error messages; the digest (the id that
 * matches the server log entry) is shown in development only, the public never sees internals (ADR-018).
 * An error in the layout itself is not caught here (a boundary never wraps its own layout).
 */
export default function LocaleError({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("error");
  const digest =
    process.env.NODE_ENV === "development" && error instanceof Error && "digest" in error
      ? String(error.digest)
      : undefined;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <title>{t("title")}</title>
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="mt-4 text-muted">{t("description")}</p>
      <button
        type="button"
        onClick={retry}
        className="mt-8 rounded-full border border-border bg-surface px-5 py-2 text-sm text-text hover:bg-surface-2"
      >
        {t("retry")}
      </button>
      {digest && <p className="mt-6 font-mono text-xs text-muted">{t("digest", { digest })}</p>}
    </div>
  );
}
