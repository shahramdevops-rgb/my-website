import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/admin/LoginForm";
import { Card } from "@/components/ui/Card";
import { adminCookieName, nextParam, safeNextPath } from "@/lib/admin/paths";
import { adminLocale, getCurrentAdmin, setupAdminLocale } from "@/lib/admin/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: await adminLocale(), namespace: "admin.login" });
  return { title: t("title") };
}

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  await setupAdminLocale();
  const value = (await searchParams)[nextParam];
  const next = safeNextPath(typeof value === "string" ? value : undefined);

  // Already signed in (a bookmark, the Back button): straight on. Asked only when a cookie exists, and a failing
  // API just shows the form — the sign-in attempt will report the problem.
  if ((await cookies()).has(adminCookieName)) {
    const admin = await getCurrentAdmin().catch(() => null);
    if (admin) redirect(next);
  }

  const t = await getTranslations("admin");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <p className="text-sm font-medium text-accent">{t("brand")}</p>
        <h1 className="mt-1 text-2xl font-bold text-text">{t("login.title")}</h1>
        <p className="mt-2 mb-6 text-sm text-muted">{t("login.description")}</p>
        <LoginForm next={next} />
      </Card>
    </main>
  );
}
