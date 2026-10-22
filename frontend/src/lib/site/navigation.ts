// The main navigation (architecture.md §6), in display order. `key` names the label in messages (`nav.<key>`);
// `href` has no language, the locale-aware Link adds it. Pages that don't exist yet answer 404 until their phase.
export const mainNav = [
  { key: "home", href: "/" },
  { key: "about", href: "/about" },
  { key: "projects", href: "/projects" },
  { key: "blog", href: "/blog" },
  { key: "services", href: "/services" },
  { key: "resume", href: "/resume" },
  { key: "contact", href: "/contact" },
] as const;

export type NavItem = { href: string; label: string };

/**
 * Whether `href` is the section of the page at `pathname` (both without the language), for aria-current.
 * Home matches only itself; any other item also matches its sub-pages (/blog/my-post is in "Blog").
 */
export function isCurrentSection(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
