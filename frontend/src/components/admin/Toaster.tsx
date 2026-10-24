"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { takeFlash } from "@/lib/admin/flash";
import { cn } from "@/lib/ui/cn";

export type ToastTone = "success" | "danger" | "info";

type Toast = { id: number; message: string; tone: ToastTone };

type ShowToast = (message: string, tone?: ToastTone) => void;

const ToastContext = createContext<ShowToast | null>(null);

/** How long a toast stays; long enough to read two lines, and it can be closed earlier. */
const visibleMilliseconds = 6000;

/**
 * Short notices in the admin panel ("Saved", "Signed out"): `const toast = useToast(); toast(t("…"), "success")`.
 * The list is one polite live region that exists from the first render, so screen readers announce each new toast
 * without moving focus. A message parked by setFlash() before a navigation is shown once on the next page.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("admin");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback<ShowToast>(
    (message, tone = "success") => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, message, tone }]);
      setTimeout(() => dismiss(id), visibleMilliseconds);
    },
    [dismiss],
  );

  // On every page change — a full load or a client-side navigation, which keeps this provider mounted — after
  // mount (sessionStorage doesn't exist on the server), in a task of its own so the effect only schedules work.
  // Taken inside the timer: Strict Mode's extra mount cancels the first timer, not the message.
  const pathname = usePathname();
  useEffect(() => {
    const timer = setTimeout(() => {
      const flash = takeFlash();
      if (flash) show(t(`flash.${flash}`), "info");
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname, show, t]);

  return (
    <ToastContext value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-label={t("toast.region")}
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:end-4"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface p-4 text-sm text-text shadow-lg motion-safe:animate-[toast-in_200ms_ease-out]",
              toast.tone === "danger" && "border-danger",
              toast.tone === "success" && "border-success",
              toast.tone === "info" && "border-accent",
            )}
          >
            <p className="flex-1">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label={t("toast.dismiss")}
              className="-m-1 rounded-md p-1 text-muted hover:bg-surface-2 hover:text-text"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside <ToastProvider>.");
  return show;
}
