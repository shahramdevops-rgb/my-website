"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { setFlash } from "@/lib/admin/flash";
import { adminLoginPath } from "@/lib/admin/paths";
import { browserApi } from "@/lib/api/browser";
import { useToast } from "./Toaster";

/**
 * Ends the session at the API (which expires the HttpOnly cookie — JavaScript can't), then goes to the login page.
 * If the API can't be reached the admin stays where they are and is told so: claiming "signed out" while the
 * cookie still works would be the worst answer on a shared computer.
 */
export function LogoutButton() {
  const t = useTranslations("admin");
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      const { response } = await browserApi.POST("/api/auth/logout");
      if (!response.ok) throw new Error(`Logout failed with ${response.status}`);
      setFlash("signedOut");
      router.replace(adminLoginPath);
      // Drops the panel's pages from the client router cache, so Back can't show them again.
      router.refresh();
    } catch {
      toast(t("login.errors.unavailable"), "danger");
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm text-text hover:bg-surface-2 disabled:opacity-50"
    >
      {t("shell.logout")}
    </button>
  );
}
