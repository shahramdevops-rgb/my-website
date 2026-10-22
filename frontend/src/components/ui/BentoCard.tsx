import { cn } from "@/lib/ui/cn";
import { Card, type CardProps } from "./Card";

// Full class names (not built from the number): Tailwind finds classes by scanning the source as text.
// Spans start at md; below it the grid has one column and every card is full width.
const columnSpans = {
  1: "",
  2: "md:col-span-2",
  3: "md:col-span-2 lg:col-span-3",
  4: "md:col-span-2 lg:col-span-4",
} as const;

const rowSpans = {
  1: "",
  2: "md:row-span-2",
} as const;

type BentoCardProps = CardProps & {
  /** Columns of BentoGrid's 4-column layout (2 columns at md). */
  columns?: keyof typeof columnSpans;
  rows?: keyof typeof rowSpans;
};

/**
 * One tile of a BentoGrid. The `bento-card` class draws the spotlight glow (globals.css) from the --x/--y that
 * BentoGrid writes; outside a BentoGrid it is a plain Card.
 */
export function BentoCard({ columns = 1, rows = 1, className, ...props }: BentoCardProps) {
  return (
    <Card
      className={cn("bento-card", columnSpans[columns], rowSpans[rows], className)}
      {...props}
    />
  );
}
