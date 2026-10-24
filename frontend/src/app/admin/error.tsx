"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Shown when an admin page throws — most often the API is unreachable (getCurrentAdmin throws instead of claiming
 * "signed out"). Like the public error page, no internals: the digest only in development.
 */
export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("error");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <title>{t("title")}</title>
      <h1 className="text-3xl font-bold text-text">{t("title")}</h1>
      <p className="mt-4 text-muted">{t("description")}</p>
      <Button onClick={retry} className="mt-6">
        {t("retry")}
      </Button>
    </main>
  );
}
