import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import type { Locale } from "@/lib/i18n/config";

const hintId = "resume-pdf-hint";

/**
 * Placeholder for the PDF download: disabled until P9 lets the admin upload the PDF. The hint says why, and
 * aria-describedby reads it with the button. Hidden on paper: a printed page can't download anything.
 */
export async function DownloadPdf({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "resume.download" });

  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 print:hidden">
      <Button disabled aria-describedby={hintId}>
        {t("label")}
      </Button>
      <p id={hintId} className="text-sm text-muted">
        {t("hint")}
      </p>
    </div>
  );
}
