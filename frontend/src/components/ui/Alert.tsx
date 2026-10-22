import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export type AlertVariant = "info" | "success" | "danger";

const styles: Record<AlertVariant, { box: string; icon: string }> = {
  info: { box: "border-accent bg-accent-soft", icon: "text-accent" },
  success: { box: "border-success bg-surface-2", icon: "text-success" },
  danger: { box: "border-danger bg-surface-2", icon: "text-danger" },
};

type AlertProps = {
  variant?: AlertVariant;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * A message about the page or a form (sent, failed, sandbox notice). Danger uses role="alert", which screen
 * readers announce at once; the others use role="status", announced when the reader is idle. Both announce only
 * a message that appears after the page loaded — render the Alert when the event happens, not hidden in advance.
 */
export function Alert({ variant = "info", title, children, className }: AlertProps) {
  const style = styles[variant];

  return (
    <div
      role={variant === "danger" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-xl border p-4 text-sm text-text", style.box, className)}
    >
      <AlertIcon variant={variant} className={cn("mt-0.5 size-5 shrink-0", style.icon)} />
      <div>
        {title && <p className="font-medium">{title}</p>}
        <div className={title ? "mt-1" : undefined}>{children}</div>
      </div>
    </div>
  );
}

function AlertIcon({ variant, className }: { variant: AlertVariant; className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      {variant === "success" && <path d="m8 12 3 3 5-6" />}
      {variant === "danger" && <path d="M12 7v6M12 16.5v.5" />}
      {variant === "info" && <path d="M12 11v6M12 7.5v.5" />}
    </svg>
  );
}
