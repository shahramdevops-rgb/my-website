/**
 * The About page's portrait. A clearly marked placeholder until Mahdi provides a photo: then it becomes a
 * next/image of a file in src/ (self-hosted, ADR-007) with the name as its alt text, in this same square box,
 * so nothing around it moves. Until then it carries no information and screen readers skip it.
 */
export function PhotoSlot() {
  return (
    <div
      aria-hidden="true"
      data-placeholder="photo"
      className="flex size-40 shrink-0 items-center justify-center rounded-2xl border border-dashed border-border bg-surface-2 text-muted md:size-48"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-16"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" strokeLinecap="round" />
      </svg>
    </div>
  );
}
