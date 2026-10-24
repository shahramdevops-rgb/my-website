import { AdminShell } from "@/components/admin/AdminShell";
import { getCurrentAdmin, redirectToLogin, setupAdminLocale } from "@/lib/admin/server";

/**
 * Every page of the panel except the login page (a route group: "(panel)" is not part of the URL). The API is asked
 * who is signed in: a cookie that exists but expired or was revoked sends the admin to the login page here, before
 * any panel page shows. The API stays the real gate for the data itself.
 */
export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const locale = await setupAdminLocale();
  const admin = await getCurrentAdmin();
  if (!admin) return redirectToLogin();

  return (
    <AdminShell email={admin.email} locale={locale}>
      {children}
    </AdminShell>
  );
}
