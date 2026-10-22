/**
 * Joins class names, skipping the falsy ones: `cn("p-4", isOpen && "block")`. A caller's `className` is appended,
 * so it can add classes; it doesn't remove a component's own (no tailwind-merge — not worth a dependency yet).
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
