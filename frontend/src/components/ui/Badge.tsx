import { useTranslations } from "next-intl";
import { cn } from "@/lib/ui/cn";

export const badgeStatuses = ["live", "inProgress", "archived"] as const;
export type BadgeStatus = (typeof badgeStatuses)[number];

// Each text/background pair is one that contrast.test.ts checks; the dot is decoration next to the word.
const styles: Record<BadgeStatus, { badge: string; dot: string }> = {
  live: { badge: "bg-surface-2 text-success", dot: "bg-success motion-safe:animate-pulse" },
  inProgress: { badge: "bg-accent-soft text-accent", dot: "bg-accent" },
  archived: { badge: "bg-surface-2 text-muted", dot: "bg-muted" },
};

/**
 * A project's state (P6): live, in progress or archived. The word carries the meaning — color and the pulsing dot
 * only repeat it — so it reads the same without color or motion.
 */
export function Badge({ status }: { status: BadgeStatus }) {
  const t = useTranslations("ui.badge");
  const style = styles[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        style.badge,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", style.dot)} />
      {t(status)}
    </span>
  );
}
