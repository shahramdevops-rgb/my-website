"use client";

import { type MouseEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";

/**
 * The navigation below the `lg` breakpoint: a disclosure button (aria-expanded) and the panel right after it, so
 * Tab moves from the button straight into the links. Esc closes it and puts focus back on the button; following a
 * link closes it too. `children` is the navigation itself, rendered by the header.
 */
export function MobileMenu({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      // Focus was in the panel, which is about to disappear: without this it would fall back to <body>.
      buttonRef.current?.focus();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  // One listener for every link in the panel (event delegation): a click on a link means "go there".
  function closeOnLinkClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest("a")) setOpen(false);
  }

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-text hover:bg-surface-2"
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      {/* The header's inner container is the positioning parent: the panel spans its width, just below it. */}
      <div
        id={panelId}
        hidden={!open}
        onClick={closeOnLinkClick}
        className="absolute inset-x-0 top-full border-b border-border bg-bg px-4 py-3"
      >
        {children}
      </div>
    </div>
  );
}

const iconProps = {
  viewBox: "0 0 24 24",
  "aria-hidden": true,
  className: "size-5",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function MenuIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg {...iconProps}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
