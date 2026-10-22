import { BentoCard } from "@/components/ui/BentoCard";

type HeroCardProps = {
  name: string;
  /** The résumé's one-line headline (ADR-013): the same words as the Resume page and `/api/resume`. */
  headline: string;
  pitch: string;
  status: string;
};

/**
 * The first card of the home page: who (the page's only h1), what, and why it matters to the reader.
 * The last line is the slot for the live status line (P11-T7: "online · p95 · deployed"); until the API measures
 * those numbers it says so instead of showing any (ADR-018). Its height is reserved now, so filling it causes no
 * layout shift.
 */
export function HeroCard({ name, headline, pitch, status }: HeroCardProps) {
  return (
    <BentoCard
      as="section"
      labelledBy="home-hero"
      columns={2}
      rows={2}
      className="flex flex-col justify-between gap-10"
    >
      <div>
        <p className="text-sm font-medium text-accent">{headline}</p>
        <h1 id="home-hero" className="mt-4 text-4xl font-bold md:text-5xl">
          {name}
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">{pitch}</p>
      </div>
      <p className="flex min-h-6 items-center gap-2 text-sm text-muted">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-muted" />
        {status}
      </p>
    </BentoCard>
  );
}
