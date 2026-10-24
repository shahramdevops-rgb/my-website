// The admin sidebar (P5-T5), in display order. `key` names the label in messages (`admin.nav.<key>`). A section
// whose phase hasn't come yet is listed with `ready: false`: shown, but not a link (no 404s inside the panel).
// Each later task flips its own entry when its page exists.
export const adminNav = [
  { key: "dashboard", href: "/admin", ready: true },
  { key: "posts", href: "/admin/posts", ready: false }, // P7
  { key: "projects", href: "/admin/projects", ready: false }, // P6
  { key: "comments", href: "/admin/comments", ready: false }, // P8
  { key: "messages", href: "/admin/messages", ready: false }, // P9
  { key: "resume", href: "/admin/resume", ready: false }, // P9
  { key: "subscribers", href: "/admin/subscribers", ready: false }, // P14
] as const;

export type AdminNavKey = (typeof adminNav)[number]["key"];

export type AdminNavItem = { href: string; label: string; ready: boolean };

/** Whether the sidebar item `href` is the current section; the dashboard matches only itself. */
export function isCurrentAdminSection(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
