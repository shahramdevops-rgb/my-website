"use client";

import { useSyncExternalStore } from "react";
import { decodeEmail } from "@/lib/contact/email";

type EmailLinkProps = {
  /** The address from `encodeEmail`: it never appears as text in the server's HTML or the RSC payload. */
  encoded: readonly number[];
  /** A fixed link text (the footer's "Email"). Without it the link shows the address once it is decoded. */
  label?: string;
  /** Without a label: the text before hydration and without JavaScript — the address written so harvesters miss it. */
  obfuscated?: string;
  /** Where the link goes before hydration and without JavaScript; without it there is no href until then. */
  fallbackHref?: string;
  className?: string;
  rel?: string;
};

// Nothing to subscribe to: the snapshot only tells the server render (false) from the browser (true).
const subscribe = () => () => {};

/**
 * A `mailto:` link that exists only in the browser (email obfuscation, `lib/contact/email.ts`). The server and the
 * hydration render show the fallback; React then re-renders with the decoded address — no effect, no mismatch.
 */
export function EmailLink({
  encoded,
  label,
  obfuscated,
  fallbackHref,
  className,
  rel,
}: EmailLinkProps) {
  const inBrowser = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const address = inBrowser ? decodeEmail(encoded) : null;

  return (
    <a
      href={address ? `mailto:${address}` : fallbackHref}
      rel={rel}
      // An address reads left to right in a Persian page too.
      dir={label ? undefined : "ltr"}
      className={className}
    >
      {label ?? address ?? obfuscated}
    </a>
  );
}
