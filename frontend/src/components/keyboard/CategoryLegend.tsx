import { type TechCategory, techCategories } from "@/lib/keyboard/keycaps";
import { cn } from "@/lib/ui/cn";
import { categoryColors } from "./category-colors";

/**
 * The key to the keycap colors (P3-T12): "■ Back-end ■ Front-end ■ Database ■ DevOps". Color is never the only
 * signal — this legend names the colors, and the card and each button's description name the category.
 * Hidden from assistive technology: it explains colors, and the buttons already announce their category.
 */
export function CategoryLegend({ labels }: { labels: Record<TechCategory, string> }) {
  return (
    <ul aria-hidden="true" className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {techCategories.map((category) => (
        <li key={category} className="inline-flex items-center gap-1.5">
          <CategoryMark category={category} />
          {labels[category]}
        </li>
      ))}
    </ul>
  );
}

/** A small square in the category's color, like a swatch in a keycap set's catalogue. */
export function CategoryMark({
  category,
  className,
}: {
  category: TechCategory;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-[3px]",
        categoryColors[category].mark,
        className,
      )}
    />
  );
}
