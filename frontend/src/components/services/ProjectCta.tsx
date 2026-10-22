import { useTranslations } from "next-intl";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";

/** The Services page's last section: the one next step for a client, to the contact form. */
export function ProjectCta() {
  const t = useTranslations("services.cta");

  return (
    <Card
      as="section"
      labelledBy="services-cta"
      className="mt-16 flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:p-10"
    >
      <div className="max-w-2xl">
        <h2 id="services-cta" className="text-2xl font-bold">
          {t("title")}
        </h2>
        <p className="mt-3 text-muted">{t("body")}</p>
      </div>
      {/* ?type=project preselects the request type on the contact form (P9-T1), as on the home page. */}
      <ButtonLink
        href={{ pathname: "/contact", query: { type: "project" } }}
        className="shrink-0 self-start md:self-auto"
      >
        {t("action")}
      </ButtonLink>
    </Card>
  );
}
