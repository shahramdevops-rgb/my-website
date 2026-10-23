import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { displayUrl } from "@/lib/contact/display-url";
import { encodeEmail, splitEmail } from "@/lib/contact/email";
import type { Locale } from "@/lib/i18n/config";
import type { SiteInfo } from "@/lib/site/get-site-info";
import { EmailLink } from "./EmailLink";

const headingId = "contact-links-title";
const linkClass = "font-medium text-accent [overflow-wrap:anywhere] hover:underline";

/**
 * One card per contact link the API has configured (`null` = not set, no card — CLAUDE.md §5: email, GitHub,
 * Telegram only). With none configured yet, a notice says they are coming instead of an empty grid.
 */
export async function ContactLinks({
  locale,
  social,
}: {
  locale: Locale;
  social: SiteInfo["social"];
}) {
  const t = await getTranslations({ locale, namespace: "contact" });
  const { email, gitHub, telegram } = social;

  return (
    <section aria-labelledby={headingId} className="mt-12">
      <h2 id={headingId} className="text-xl font-bold">
        {t("links.title")}
      </h2>
      {!email && !gitHub && !telegram ? (
        <Alert className="mt-4">{t("links.none")}</Alert>
      ) : (
        // auto-fit: two or three cards share the row on wide screens; one column on a phone.
        <ul
          role="list"
          className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-4"
        >
          {email && (
            <ContactCard title={t("email.title")} body={t("email.body")}>
              <EmailLink
                encoded={encodeEmail(email)}
                obfuscated={t("email.obfuscated", splitEmail(email))}
                rel="me"
                className={linkClass}
              />
            </ContactCard>
          )}
          {gitHub && (
            <ContactCard title={t("gitHub.title")} body={t("gitHub.body")}>
              <a href={gitHub} rel="me" dir="ltr" className={linkClass}>
                {displayUrl(gitHub)}
              </a>
            </ContactCard>
          )}
          {telegram && (
            <ContactCard title={t("telegram.title")} body={t("telegram.body")}>
              <a href={telegram} rel="me" dir="ltr" className={linkClass}>
                {displayUrl(telegram)}
              </a>
            </ContactCard>
          )}
        </ul>
      )}
    </section>
  );
}

function ContactCard({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <li>
      <Card className="flex h-full flex-col">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="mt-1 text-sm text-muted">{body}</p>
        <p className="mt-auto pt-4">{children}</p>
      </Card>
    </li>
  );
}
