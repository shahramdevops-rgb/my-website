import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Guards WCAG AA contrast for the design tokens in globals.css (architecture.md §8.1), so a palette tweak that
// makes text unreadable fails the build instead of shipping. Port of P1's ColorContrastTests.

// WCAG 2.2: normal text needs 4.5:1 (SC 1.4.3); UI parts such as focus rings need 3:1 (SC 1.4.11).
const textMinimum = 4.5;
const nonTextMinimum = 3;

const themes = ["dark", "light"] as const;
type Theme = (typeof themes)[number];

const backgrounds = ["bg", "surface", "surface-2"];

const textPairs: [foreground: string, background: string][] = [
  ...["text", "muted", "accent", "success", "danger"].flatMap((foreground) =>
    backgrounds.map((background): [string, string] => [foreground, background]),
  ),
  ["text", "accent-soft"], // tag text
  ["accent", "accent-soft"], // tag text
  ["bg", "accent"], // label on a primary button
];

// Vitest runs from frontend/ (jsdom gives import.meta.url an http: scheme, so no path relative to this file).
const css = readFileSync(join(process.cwd(), "src", "styles", "globals.css"), "utf8");

/** Dark values live in `@theme static { … }`, light overrides in `:root[data-theme="light"] { … }`. */
function tokens(theme: Theme): Map<string, string> {
  const blockStart = theme === "dark" ? "@theme static {" : ':root[data-theme="light"] {';
  const start = css.indexOf(blockStart);
  if (start < 0) throw new Error(`'${blockStart}' not found in globals.css`);
  const block = css.slice(start, css.indexOf("}", start));

  const matches = block.matchAll(/--color-(?<name>[a-z0-9-]+):\s*(?<hex>#[0-9a-fA-F]{6});/g);
  return new Map([...matches].map((m) => [m.groups?.name ?? "", m.groups?.hex ?? ""]));
}

function token(theme: Theme, name: string): string {
  const value = tokens(theme).get(name);
  if (!value) throw new Error(`--color-${name} missing in the ${theme} theme`);
  return value;
}

// https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
function relativeLuminance(hex: string): number {
  const channel = (offset: number) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

// https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (lighter + 0.05) / (darker + 0.05);
}

describe.each(themes)("%s theme", (theme) => {
  it.each(textPairs)("%s on %s meets WCAG AA for text (4.5:1)", (foreground, background) => {
    const ratio = contrastRatio(token(theme, foreground), token(theme, background));

    expect(ratio).toBeGreaterThanOrEqual(textMinimum);
  });

  it.each(backgrounds)("the focus ring (accent) on %s meets 3:1", (background) => {
    const ratio = contrastRatio(token(theme, "accent"), token(theme, background));

    expect(ratio).toBeGreaterThanOrEqual(nonTextMinimum);
  });
});

it("the light theme overrides every dark token", () => {
  expect([...tokens("light").keys()].sort()).toEqual([...tokens("dark").keys()].sort());
});

it("the contrast formula matches the WCAG reference values", () => {
  expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
});
