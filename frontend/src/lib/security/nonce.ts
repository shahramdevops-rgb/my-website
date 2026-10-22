import "server-only";
import { headers } from "next/headers";
import { nonceHeaderName } from "@/lib/security/headers";

/** This request's CSP nonce (set by proxy.ts), for the few inline scripts we write ourselves. */
export async function getNonce(): Promise<string | undefined> {
  return (await headers()).get(nonceHeaderName) ?? undefined;
}
