"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type AdminNavItem, isCurrentAdminSection } from "@/lib/admin/navigation";

/**
 * The sidebar's links (a client leaf only for aria-current, which needs the URL). next/link, not the i18n Link:
 * the panel has no language prefix. A section that doesn't exist yet is plain text with a "soon" mark — not a
 * link to a 404, and not a disabled link, which keyboards would still stop at.
 */
export function AdminNav({ items, soonLabel }: { items: AdminNavItem[]; soonLabel: string }) {
  const pathname = usePathname();

  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.href}>
          {item.ready ? (
            <Link
              href={item.href}
              aria-current={isCurrentAdminSection(pathname, item.href) ? "page" : undefined}
              className="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text aria-[current=page]:bg-accent-soft aria-[current=page]:font-medium aria-[current=page]:text-accent"
            >
              {item.label}
            </Link>
          ) : (
            <span className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-muted">
              {item.label}
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs">{soonLabel}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
