import type { ComponentProps } from "react";
import { buttonClassName, type ButtonVariant } from "./button-styles";

type ButtonProps = ComponentProps<"button"> & { variant?: ButtonVariant };

/**
 * An action on this page (submit, open, retry). For navigation use ButtonLink: a link that looks like a button
 * is still a link to screen readers and opens in a new tab with a middle click.
 */
export function Button({ variant = "primary", type = "button", className, ...props }: ButtonProps) {
  // type="button" by default: inside a <form>, a plain <button> would submit it.
  return <button type={type} className={buttonClassName(variant, className)} {...props} />;
}
