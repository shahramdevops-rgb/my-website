import { Badge } from "@/components/ui/Badge";
import { BentoCard } from "@/components/ui/BentoCard";

type UpcomingCardProps = {
  /** Id of the card's heading; also names the card for screen readers. */
  id: string;
  title: string;
  body: string;
  columns?: 1 | 2;
};

/**
 * A home card whose content comes from a later phase (projects and demo: P6, posts: P7). It says what will be here
 * and that it is being built — no sample data dressed up as real (ADR-018). Each is replaced by its real card.
 */
export function UpcomingCard({ id, title, body, columns = 1 }: UpcomingCardProps) {
  return (
    <BentoCard as="section" labelledBy={id} columns={columns} className="flex flex-col">
      <h2 id={id} className="text-xl font-bold">
        {title}
      </h2>
      <p className="mt-2 text-muted">{body}</p>
      <div className="mt-auto pt-6">
        <Badge status="inProgress" />
      </div>
    </BentoCard>
  );
}
