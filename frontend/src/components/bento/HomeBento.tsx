import { useTranslations } from "next-intl";
import { BentoGrid } from "@/components/ui/BentoGrid";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { buildKeycaps } from "@/lib/keyboard/keycaps";
import type { Resume } from "@/lib/resume/get-resume";
import { HeroCard } from "./HeroCard";
import { PathCard } from "./PathCard";
import { StackCard } from "./StackCard";
import { UpcomingCard } from "./UpcomingCard";

/**
 * The home page's Bento grid (ADR-024). At lg (4 columns):
 *
 *   [ hero 2×2        ][ keyboard 2×2      ]
 *   [ hiring path     ][ project path      ]
 *   [ featured projects ][ demo ][ posts   ]
 *
 * At md (2 columns) every 2-wide card fills the row and demo + posts share one; on phones it is one column in this
 * same order, which is also the reading and Tab order.
 */
export function HomeBento({ name, resume }: { name: string; resume: Resume }) {
  const t = useTranslations("home");

  return (
    <BentoGrid>
      <HeroCard
        name={name}
        headline={resume.basics.headline}
        pitch={t("hero.pitch")}
        status={t("hero.status")}
      />
      <StackCard keycaps={buildKeycaps(resume)} />
      <PathCard
        id="home-hiring"
        eyebrow={t("hiring.eyebrow")}
        title={t("hiring.title")}
        body={t("hiring.body")}
      >
        <ButtonLink href="/resume">{t("hiring.resume")}</ButtonLink>
        <ButtonLink href="/decisions" variant="ghost">
          {t("hiring.decisions")}
        </ButtonLink>
      </PathCard>
      <PathCard
        id="home-project"
        eyebrow={t("project.eyebrow")}
        title={t("project.title")}
        body={t("project.body")}
      >
        {/* ?type=project preselects the request type on the contact form (P9-T1). */}
        <ButtonLink href={{ pathname: "/contact", query: { type: "project" } }}>
          {t("project.contact")}
        </ButtonLink>
        <ButtonLink href="/services" variant="ghost">
          {t("project.services")}
        </ButtonLink>
      </PathCard>
      <UpcomingCard
        id="home-projects"
        columns={2}
        title={t("projects.title")}
        body={t("projects.body")}
      />
      <UpcomingCard id="home-demo" title={t("demo.title")} body={t("demo.body")} />
      <UpcomingCard id="home-posts" title={t("posts.title")} body={t("posts.body")} />
    </BentoGrid>
  );
}
