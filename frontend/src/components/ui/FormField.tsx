import { type ComponentProps, useId } from "react";
import { cn } from "@/lib/ui/cn";

type FieldElementProps =
  | ({ multiline?: false } & ComponentProps<"input">)
  | ({ multiline: true } & ComponentProps<"textarea">);

type FormFieldProps = FieldElementProps & {
  label: string;
  /** Help shown under the field at all times. */
  hint?: string;
  /** The validation message (from the server); also marks the field invalid. */
  error?: string;
  name: string;
};

const controlClassName =
  "w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-base text-text placeholder:text-muted aria-invalid:border-danger";

/**
 * A labelled input or textarea with optional hint and error. The control points at both texts with
 * aria-describedby, so a screen reader reads them when the field gets focus; aria-invalid flags the error.
 * Announcing errors when the form is sent is the form's job (an Alert listing them), not each field's.
 */
export function FormField({ label, hint, error, className, ...control }: FormFieldProps) {
  // Unique per field even when two forms on a page both have an "email" field (contact form + newsletter).
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = cn(hint && hintId, error && errorId) || undefined;
  const shared = {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: cn(controlClassName, className),
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
      </label>
      {control.multiline ? (
        <textarea rows={5} {...withoutMultiline(control)} {...shared} />
      ) : (
        <input type="text" {...withoutMultiline(control)} {...shared} />
      )}
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

// `multiline` only picks the element; it must not reach the DOM as an attribute.
function withoutMultiline<T extends { multiline?: boolean }>(props: T): Omit<T, "multiline"> {
  const { multiline, ...rest } = props;
  return rest;
}
