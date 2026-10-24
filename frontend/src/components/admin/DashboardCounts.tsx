import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { adminNav, type AdminNavKey } from "@/lib/admin/navigation";
import type { AdminDashboard } from "@/lib/admin/server";
import { formatNumber } from "@/lib/format/number";
import type { Locale } from "@/lib/i18n/config";

/** Which count belongs to which sidebar section (its link and whether that section exists yet). */
const counts: { key: keyof AdminDashboard; section: AdminNavKey }[] = [
  { key: "pendingComments", section: "comments" },
  { key: "unreadMessages", section: "messages" },
  { key: "posts", section: "posts" },
  { key: "projects", section: "projects" },
  { key: "subscribers", section: "subscribers" },
];

/**
 * One card per count, things waiting for the admin first. A card links to its section once that section exists;
 * until then it says so instead of linking to a 404.
 */
export async function DashboardCounts({
  dashboard,
  locale,
}: {
  dashboard: AdminDashboard;
  locale: Locale;
}) {
  const t = await getTranslations("admin.dashboard");

  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {counts.map(({ key, section }) => {
        const nav = adminNav.find((item) => item.key === section);
        const content = (
          <>
            <span className="block text-sm text-muted">{t(key)}</span>
            <span className="mt-2 block text-3xl font-bold text-text">
              {formatNumber(dashboard[key], locale)}
            </span>
            {!nav?.ready && <span className="mt-2 block text-xs text-muted">{t("soon")}</span>}
          </>
        );

        return (
          <li key={key}>
            {nav?.ready ? (
              <Link
                href={nav.href}
                className="block h-full rounded-2xl border border-border bg-surface p-6 hover:border-accent"
              >
                {content}
              </Link>
            ) : (
              <div className="h-full rounded-2xl border border-border bg-surface p-6">
                {content}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
