"use client";

import { Link, usePathname } from "@/lib/i18n/navigation";
import { isCurrentSection, type NavItem } from "@/lib/site/navigation";

/**
 * The main navigation's links. A client leaf only because the current page (aria-current) comes from the URL,
 * which a layout on the server doesn't receive; labels arrive already translated.
 */
export function NavLinks({ items, vertical = false }: { items: NavItem[]; vertical?: boolean }) {
  const pathname = usePathname();

  return (
    <ul className={vertical ? "flex flex-col gap-1" : "flex items-center gap-1"}>
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            aria-current={isCurrentSection(pathname, item.href) ? "page" : undefined}
            className={`block rounded-md px-3 text-muted hover:bg-surface-2 hover:text-text aria-[current=page]:font-medium aria-[current=page]:text-text ${
              vertical ? "py-3 text-base" : "py-2 text-sm"
            }`}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
