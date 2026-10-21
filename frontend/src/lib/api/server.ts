import "server-only";
import { cookies } from "next/headers";
import createClient, { type Client } from "openapi-fetch";
import { serverEnv } from "@/lib/env";
import type { paths } from "./schema";

export type ApiClient = Client<paths>;

/**
 * API client for Server Components and route handlers. It calls the API directly over the internal network
 * (`API_INTERNAL_URL`), so server-side requests never leave the machine or pass through Caddy.
 */
export function createServerApi(headers?: Record<string, string>): ApiClient {
  return createClient<paths>({ baseUrl: serverEnv().apiInternalUrl, headers });
}

/**
 * Same, but forwards the visitor's cookies, so the API sees the logged-in admin (used from P5).
 * Reading cookies makes the page render per visitor: use it only where the response depends on who asks.
 */
export async function createServerApiWithCookies(): Promise<ApiClient> {
  const cookieHeader = (await cookies()).toString();
  return createServerApi(cookieHeader ? { cookie: cookieHeader } : undefined);
}
