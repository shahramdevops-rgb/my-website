import { cn } from "@/lib/ui/cn";

export type ButtonVariant = "primary" | "ghost" | "link";

// Hover never changes the primary fill: a lighter or darker accent would weaken the label's tested contrast
// (bg on accent, contrast.test.ts). A soft accent halo marks it instead.
const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent px-5 py-2.5 font-medium text-bg hover:shadow-[0_0_0_4px_var(--color-accent-soft)]",
  ghost: "border border-border px-5 py-2.5 font-medium text-text hover:bg-surface-2",
  link: "text-accent underline-offset-4 hover:underline",
};

/** Shared by Button (<button>) and ButtonLink (<a>), so an action and a navigation look alike. */
export function buttonClassName(variant: ButtonVariant, className?: string): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full text-sm transition-shadow disabled:cursor-not-allowed disabled:opacity-50",
    variants[variant],
    className,
  );
}
