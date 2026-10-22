import { useTranslations } from "next-intl";
import { KeyboardHero } from "@/components/keyboard/KeyboardHero";
import { BentoCard } from "@/components/ui/BentoCard";
import type { Keycap } from "@/lib/keyboard/keycaps";

/**
 * The keyboard hero's card (P3-T3): the résumé's tech stack as keycaps. The server renders the heading, the
 * poster and the list of buttons; the 3D keyboard loads into the poster's box after hydration, so the card keeps
 * its size (2 × 2 cells) and nothing around it moves.
 */
export function StackCard({ keycaps }: { keycaps: Keycap[] }) {
  const t = useTranslations("home.stack");

  return (
    <BentoCard as="section" labelledBy="home-stack" columns={2} rows={2} className="flex flex-col">
      <h2 id="home-stack" className="text-xl font-bold">
        {t("title")}
      </h2>
      <p className="mt-2 mb-6 text-muted">{t("description")}</p>
      <KeyboardHero
        keycaps={keycaps}
        labels={{ hint: t("hint"), usedIn: t("usedIn"), noProjects: t("noProjects") }}
      />
    </BentoCard>
  );
}
