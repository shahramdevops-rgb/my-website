import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { createServerApiWithCookies } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";
import { type Locale, localeCookieName } from "@/lib/i18n/config";
import { resolveLocale } from "@/lib/i18n/resolve-locale";
import { adminHomePath, adminPathHeader, loginUrlFor } from "./paths";

export type CurrentAdmin = components["schemas"]["CurrentAdminDto"];
export type AdminDashboard = components["schemas"]["AdminDashboardDto"];

/**
 * The signed-in admin according to the API (`GET /api/auth/me` with the visitor's cookie), or null when the
 * session is missing, expired or revoked. Never cached: the answer depends on who asks and changes on logout.
 * Any other failure (API down) throws, and the error page shows — "signed out" would be a misleading answer.
 */
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const api = await createServerApiWithCookies();
  const { data, response } = await api.GET("/api/auth/me", { cache: "no-store" });

  if (isSignedOut(response)) return null;
  if (!data) throw new Error(`GET /api/auth/me failed with ${response.status}`);
  return data;
}

/**
 * The dashboard counts. The panel layout checks the session too, but layout and page render in parallel, so the
 * page handles an expired session itself.
 */
export async function getAdminDashboard(): Promise<AdminDashboard> {
  const api = await createServerApiWithCookies();
  const { data, response } = await api.GET("/api/admin/dashboard", { cache: "no-store" });

  if (isSignedOut(response)) return redirectToLogin();
  if (!data) throw new Error(`GET /api/admin/dashboard failed with ${response.status}`);
  return data;
}

/** To the login page, and back to the requested admin page afterwards (path from proxy.ts). */
export async function redirectToLogin(): Promise<never> {
  redirect(loginUrlFor((await headers()).get(adminPathHeader) ?? adminHomePath));
}

/** The panel's language: the visitor's `lang` cookie, then the browser's languages, then the default — like `/`. */
export async function adminLocale(): Promise<Locale> {
  return resolveLocale(
    (await cookies()).get(localeCookieName)?.value,
    (await headers()).get("accept-language"),
  );
}

/**
 * Tells next-intl the panel's language for this render and returns it. Every admin layout *and* page calls it:
 * Next renders them in parallel, so a call in the layout alone doesn't reach the page (the [locale] pages do the
 * same with setRequestLocale).
 */
export async function setupAdminLocale(): Promise<Locale> {
  const locale = await adminLocale();
  setRequestLocale(locale);
  return locale;
}

// 403 = signed in, but not as an admin (only possible if a non-admin account ever exists): treated as signed out.
function isSignedOut(response: Response): boolean {
  return response.status === 401 || response.status === 403;
}
