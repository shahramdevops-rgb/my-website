import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DashboardCounts } from "@/components/admin/DashboardCounts";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { adminLocale, getAdminDashboard, setupAdminLocale } from "@/lib/admin/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: await adminLocale(), namespace: "admin.dashboard" });
  return { title: t("title") };
}

/** `/admin`: the dashboard — what needs attention, one card per section. */
export default async function AdminDashboardPage() {
  const locale = await setupAdminLocale();
  const [t, dashboard] = await Promise.all([
    getTranslations("admin.dashboard"),
    getAdminDashboard(),
  ]);

  return (
    <div className="max-w-5xl">
      <SectionHeader as="h1" title={t("title")} description={t("description")} />
      <DashboardCounts dashboard={dashboard} locale={locale} />
    </div>
  );
}
