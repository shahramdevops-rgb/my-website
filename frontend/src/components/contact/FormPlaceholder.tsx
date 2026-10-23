import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { Locale } from "@/lib/i18n/config";

const headingId = "contact-form-title";

/**
 * Where the contact form arrives in P9 (name, email, message, request type → admin inbox). Until then it says so,
 * with the same "In progress" badge as the home page's upcoming cards — no fake form that sends nothing (ADR-018).
 */
export async function FormPlaceholder({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "contact.form" });

  return (
    <Card as="section" labelledBy={headingId} className="mt-12">
      <h2 id={headingId} className="text-xl font-bold">
        {t("title")}
      </h2>
      <p className="mt-2 text-muted">{t("body")}</p>
      <div className="mt-6">
        <Badge status="inProgress" />
      </div>
    </Card>
  );
}
