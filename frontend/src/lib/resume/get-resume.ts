import "server-only";
import { cache } from "react";
import { createServerApi } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";
import type { Locale } from "@/lib/i18n/config";

export type Resume = components["schemas"]["ResumeProfile"];

/**
 * `GET /api/resume?lang=` — the structured résumé (ADR-013) in one language. Wrapped in React's `cache()`: every
 * part of one request that needs it (page, metadata, later the keyboard hero) shares one API call per language.
 */
export const getResume = cache(async (locale: Locale): Promise<Resume> => {
  const { data, error, response } = await createServerApi().GET("/api/resume", {
    params: { query: { lang: locale } },
  });

  if (!data) {
    throw new Error(`GET /api/resume?lang=${locale} failed with status ${response.status}.`, {
      cause: error,
    });
  }

  return data;
});
