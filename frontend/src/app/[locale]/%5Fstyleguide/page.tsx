import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge, badgeStatuses } from "@/components/ui/Badge";
import { BentoCard } from "@/components/ui/BentoCard";
import { BentoGrid } from "@/components/ui/BentoGrid";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Tag } from "@/components/ui/Tag";
import { locales } from "@/lib/i18n/config";
import { samples } from "./samples";

// /{locale}/_styleguide: every UI component on one page, for development only (404 in production).
// The folder is "%5Fstyleguide" because a folder starting with "_" is private in the App Router (never a route);
// %5F is the URL-encoded underscore, so the URL still reads /_styleguide.

const isProduction = process.env.NODE_ENV === "production";

const colorTokens = [
  { name: "bg", swatch: "bg-bg" },
  { name: "surface", swatch: "bg-surface" },
  { name: "surface-2", swatch: "bg-surface-2" },
  { name: "border", swatch: "bg-border" },
  { name: "text", swatch: "bg-text" },
  { name: "muted", swatch: "bg-muted" },
  { name: "accent", swatch: "bg-accent" },
  { name: "accent-soft", swatch: "bg-accent-soft" },
  { name: "success", swatch: "bg-success" },
  { name: "danger", swatch: "bg-danger" },
];

const typeScale = [
  "text-6xl",
  "text-4xl",
  "text-2xl",
  "text-xl",
  "text-base",
  "text-sm",
  "text-xs",
];

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/_styleguide">): Promise<Metadata> {
  const { locale } = await params;
  if (isProduction || !hasLocale(locales, locale)) notFound();

  return { title: samples[locale].title, robots: { index: false } };
}

export default async function StyleGuidePage({ params }: PageProps<"/[locale]/_styleguide">) {
  const { locale } = await params;
  if (isProduction || !hasLocale(locales, locale)) notFound();
  setRequestLocale(locale);
  const s = samples[locale];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-16">
      <div>
        <h1 className="text-4xl font-bold">{s.title}</h1>
        <p className="mt-3 text-muted">{s.intro}</p>
      </div>

      <Section title={s.sections.colors}>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {colorTokens.map((token) => (
            <li key={token.name} className="flex flex-col gap-2">
              <span className={`h-14 rounded-lg border border-border ${token.swatch}`} />
              <code className="text-xs text-muted">--color-{token.name}</code>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={s.sections.typography}>
        <ul className="flex flex-col gap-4">
          {typeScale.map((size) => (
            <li key={size} className="flex flex-col gap-1">
              <code className="text-xs text-muted">{size}</code>
              <span className={`${size} font-bold`}>{s.typeSample}</span>
            </li>
          ))}
          <li className="flex flex-col gap-1">
            <code className="text-xs text-muted">font-mono</code>
            <code className="text-base">await db.SaveChangesAsync(ct);</code>
          </li>
        </ul>
      </Section>

      <Section title={s.sections.buttons}>
        <div className="flex flex-wrap items-center gap-4">
          <Button>{s.buttons.primary}</Button>
          <Button variant="ghost">{s.buttons.ghost}</Button>
          <Button variant="link">{s.buttons.link}</Button>
          <Button disabled>{s.buttons.disabled}</Button>
          <ButtonLink href="/contact">{s.buttons.primary}</ButtonLink>
          <ButtonLink href="/resume" variant="ghost">
            {s.buttons.ghost}
          </ButtonLink>
        </div>
      </Section>

      <Section title={s.sections.cards}>
        <Card as="article" className="max-w-md">
          <h3 className="text-xl font-bold">{s.card.title}</h3>
          <p className="mt-2 text-muted">{s.card.body}</p>
        </Card>
      </Section>

      <Section title={s.sections.bento}>
        <BentoGrid>
          <BentoCard columns={2} rows={2} className="flex flex-col justify-end">
            <h3 className="text-4xl font-bold">{s.bento.heroTitle}</h3>
            <p className="mt-3 text-lg text-muted">{s.bento.heroBody}</p>
          </BentoCard>
          <BentoCard columns={2}>
            <Badge status="live" />
            <h3 className="mt-3 text-xl font-bold">{s.bento.demoTitle}</h3>
            <p className="mt-1 text-muted">{s.bento.demoBody}</p>
          </BentoCard>
          <BentoCard>
            <h3 className="text-xl font-bold">{s.bento.postTitle}</h3>
            <p className="mt-1 text-muted">{s.bento.postBody}</p>
          </BentoCard>
          <BentoCard>
            <h3 className="text-xl font-bold">{s.bento.statusTitle}</h3>
            <p className="mt-1 text-muted">{s.bento.statusBody}</p>
          </BentoCard>
          <BentoCard columns={4}>
            <h3 className="text-xl font-bold">{s.bento.stackTitle}</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {s.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          </BentoCard>
        </BentoGrid>
      </Section>

      <Section title={s.sections.labels}>
        <div className="flex flex-wrap items-center gap-2">
          {s.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {badgeStatuses.map((status) => (
            <Badge key={status} status={status} />
          ))}
        </div>
      </Section>

      <Section title={s.sections.headers}>
        <SectionHeader
          as="h3"
          eyebrow={s.header.eyebrow}
          title={s.header.title}
          description={s.header.description}
          action={
            <ButtonLink href="/blog" variant="ghost">
              {s.header.action}
            </ButtonLink>
          }
        />
      </Section>

      <Section title={s.sections.forms}>
        <form className="flex max-w-lg flex-col gap-5">
          <FormField label={s.form.name} name="name" autoComplete="name" />
          {/* An email address reads left to right on a Persian page too. */}
          <FormField
            label={s.form.email}
            name="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            hint={s.form.emailHint}
            error={s.form.emailError}
            defaultValue="mahdi@"
          />
          <FormField
            multiline
            label={s.form.message}
            name="message"
            placeholder={s.form.messagePlaceholder}
          />
          <div>
            <Button type="submit">{s.form.send}</Button>
          </div>
        </form>
      </Section>

      <Section title={s.sections.alerts}>
        <div className="flex max-w-2xl flex-col gap-4">
          <Alert title={s.alerts.infoTitle}>{s.alerts.info}</Alert>
          <Alert variant="success" title={s.alerts.successTitle}>
            {s.alerts.success}
          </Alert>
          <Alert variant="danger" title={s.alerts.dangerTitle}>
            {s.alerts.danger}
          </Alert>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="border-b border-border pb-2 text-2xl font-bold">{title}</h2>
      {children}
    </section>
  );
}
