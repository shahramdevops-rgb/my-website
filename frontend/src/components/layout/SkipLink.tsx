import { getTranslations } from "next-intl/server";

/** The first focusable element on every page: invisible until focused, then jumps past the header to <main>. */
export async function SkipLink() {
  const t = await getTranslations();

  return (
    <a
      href={`#${mainContentId}`}
      className="sr-only rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg focus:not-sr-only focus:fixed focus:start-4 focus:top-3 focus:z-50"
    >
      {t("skipLink")}
    </a>
  );
}

/** id of the layout's <main>, the skip link's target. */
export const mainContentId = "main";
