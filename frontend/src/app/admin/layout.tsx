import type { Metadata } from "next";
import { connection } from "next/server";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ToastProvider } from "@/components/admin/Toaster";
import { HtmlDocument } from "@/components/layout/HtmlDocument";
import { adminLocale, setupAdminLocale } from "@/lib/admin/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: await adminLocale(), namespace: "admin.meta" });

  return {
    title: { default: t("title"), template: t("titleTemplate", { title: "%s" }) },
    // proxy.ts also sends X-Robots-Tag; the tag covers a page saved or served some other way.
    robots: { index: false, follow: false },
  };
}

/**
 * Root of the admin panel (P5-T5): its own <html>, beside app/[locale]. The panel has no language in its URL; its
 * language comes from the `lang` cookie (AdminLanguageButton). Every admin page is dynamic (CSP nonce, cookies).
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await connection();
  const locale = await setupAdminLocale();

  return (
    <HtmlDocument locale={locale}>
      <NextIntlClientProvider>
        <ToastProvider>{children}</ToastProvider>
      </NextIntlClientProvider>
    </HtmlDocument>
  );
}
