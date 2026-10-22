import type { ComponentProps } from "react";
import { Link } from "@/lib/i18n/navigation";
import { buttonClassName, type ButtonVariant } from "./button-styles";

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant };

/** A navigation styled as a button (call-to-action). Locale-aware: `href="/contact"` → `/fa/contact`. */
export function ButtonLink({ variant = "primary", className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClassName(variant, className)} {...props} />;
}
