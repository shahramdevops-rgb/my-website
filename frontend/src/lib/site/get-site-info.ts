import "server-only";
import { cache } from "react";
import { createServerApi } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";

export type SiteInfo = components["schemas"]["SiteInfoDto"];

/**
 * `GET /api/site`. Wrapped in React's `cache()`: layout, page and metadata can all ask for it during one
 * request and the API is called only once.
 */
export const getSiteInfo = cache(async (): Promise<SiteInfo> => {
  const { data, error, response } = await createServerApi().GET("/api/site");

  if (!data) {
    throw new Error(`GET /api/site failed with status ${response.status}.`, { cause: error });
  }

  return data;
});
