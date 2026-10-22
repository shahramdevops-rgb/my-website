import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { locales } from "@/lib/i18n/config";

// The localized prose (ADR-012): one file per page and language, e.g. about.fa.mdx + about.en.mdx.
const contentDir = join(import.meta.dirname, "../../../content");

const pages = [
  ...new Set(readdirSync(contentDir).map((file) => file.replace(/\.[a-z]+\.mdx$/, ""))),
];

function read(page: string, locale: string): string {
  // Without the comments: they may name components without using them.
  return readFileSync(join(contentDir, `${page}.${locale}.mdx`), "utf8").replace(
    /\{\/\*[\s\S]*?\*\/\}/g,
    "",
  );
}

/** The structure a translation must keep: components (`<Timeline`, `</Bridges`) and headings, in order. */
function outline(source: string): string[] {
  return [...source.matchAll(/^\s*(#{1,6}) |<\/?([A-Z]\w*)/gm)].map(
    (match) => match[1] ?? match[2] ?? "",
  );
}

/** The page's internal links (`](/resume)`): both languages point readers at the same pages. */
function links(source: string): string[] {
  return [...source.matchAll(/\]\((\/[^)\s]*)\)/g)].map((match) => match[1] ?? "");
}

describe("content", () => {
  it.each(pages)("%s exists in every language", (page) => {
    for (const locale of locales) {
      expect(() => read(page, locale)).not.toThrow();
    }
  });

  // A component missing from one language would leave a part of the page out for its readers.
  it.each(pages)("%s has the same components and headings in every language", (page) => {
    const [first, ...others] = locales.map((locale) => outline(read(page, locale)));
    expect(first?.length).toBeGreaterThan(0);
    for (const other of others) expect(other).toEqual(first);
  });

  it.each(pages)("%s links to the same pages in every language", (page) => {
    const [first, ...others] = locales.map((locale) => links(read(page, locale)).sort());
    for (const other of others) expect(other).toEqual(first);
  });
});
