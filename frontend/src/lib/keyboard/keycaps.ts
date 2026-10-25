// The keyboard hero's data (P3-T3): one keycap per technology of the résumé (ADR-013), each with the real key that
// presses it and the résumé entries that used it. The main stack (`techStack`) gets the big keys; what was also used
// (`alsoUsed`, P3-T10) a smaller row above them. Pure functions, shared by the server (which builds
// the keycaps) and the browser (poster, 3D scene and accessible list all read the same array).
import type { components } from "@/lib/api/schema";
import type { Resume } from "@/lib/resume/get-resume";

/** Which part of the stack a technology belongs to (P3-T11): its keycap's color and switch sound. */
export type TechCategory = components["schemas"]["TechCategory"];

/** The categories in the order the legend lists them. */
export const techCategories: readonly TechCategory[] = [
  "backend",
  "frontend",
  "database",
  "devops",
];

export type Keycap = {
  /** The résumé's language-neutral slug (`csharp`). */
  id: string;
  name: string;
  description: string;
  /** The legend printed on the keycap, e.g. "C". */
  key: string;
  /**
   * `KeyboardEvent.code` of that key, e.g. "KeyC". `code` names the physical key, so it works with a Persian
   * layout too, where `event.key` would be "ز".
   */
  code: string;
  /** Résumé entries whose `tech` lists this keycap's id, in résumé order. */
  usedIn: { organization: string; role: string }[];
  /** `main`: the stack the site is about, big keys. `also`: worked with besides it, the small top row. */
  row: KeycapRow;
  category: TechCategory;
};

export type KeycapRow = "main" | "also";

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const digits = "0123456789";

function codeOf(key: string): string {
  return letters.includes(key) ? `Key${key}` : `Digit${key}`;
}

/**
 * Gives each technology its own key: the first letter (or digit) of its name that no earlier technology took —
 * C# → C, .NET → N, Next.js → X once N is taken. A name with no free character falls back to the first free
 * letter, then digit. Résumé order decides, the main stack first, so the same résumé always gives the same keys
 * and the main stack gets the memorable ones. More than 36 technologies can't all have a key; the rest get none
 * and are left out.
 */
export function buildKeycaps(
  resume: Pick<Resume, "techStack" | "alsoUsed" | "experience">,
): Keycap[] {
  const taken = new Set<string>();
  const keycaps: Keycap[] = [];
  const technologies = [
    ...resume.techStack.map((tech) => ({ tech, row: "main" as const })),
    ...resume.alsoUsed.map((tech) => ({ tech, row: "also" as const })),
  ];

  for (const { tech, row } of technologies) {
    const fromName = [...tech.name.toUpperCase()].filter(
      (character) => letters.includes(character) || digits.includes(character),
    );
    const key = [...fromName, ...letters, ...digits].find((character) => !taken.has(character));
    if (key === undefined) break;
    taken.add(key);

    keycaps.push({
      id: tech.id,
      name: tech.name,
      description: tech.description,
      key,
      code: codeOf(key),
      usedIn: resume.experience
        .filter((entry) => entry.tech.includes(tech.id))
        .map(({ organization, role }) => ({ organization, role })),
      row,
      category: tech.category,
    });
  }

  return keycaps;
}

/** The keycaps of one row group, in résumé order. */
export function keycapsIn(keycaps: Keycap[], row: KeycapRow): Keycap[] {
  return keycaps.filter((keycap) => keycap.row === row);
}

/** An "also used" keycap's width, in main keycaps: narrower, so the main stack still leads its row. */
export const alsoKeyWidth = 0.8;
/** One row's depth, in main keycap widths (a keycap is 8:5): how far the next row is for the light ripple. */
const rowPitch = 0.7;

/** A keycap's place on the keyboard: its row, and where it starts and how wide it is, in main keycap widths. */
export type PlacedKey = { keycap: Keycap; row: number; start: number; width: number };

export type KeyboardLayout = {
  rows: { category: TechCategory; keys: PlacedKey[] }[];
  /** The longest row's width, in main keycap widths: the plate's width. */
  width: number;
};

/**
 * The keyboard's arrangement, the same for the poster, the 3D scene, the sound and the ripple: one row per category
 * (P3-T11's request from Shahram, 2026-10-25: related technologies side by side), in the legend's order — the main
 * stack's big keys first, then the narrower "also used" keys, each group in résumé order. Rows start at the left
 * edge like a real keyboard's; a category without technologies has no row.
 */
export function keyboardLayout(keycaps: Keycap[]): KeyboardLayout {
  const rows = techCategories
    .map((category) => {
      const inRow = keycaps.filter((keycap) => keycap.category === category);
      return { category, keycaps: [...keycapsIn(inRow, "main"), ...keycapsIn(inRow, "also")] };
    })
    .filter(({ keycaps: inRow }) => inRow.length > 0)
    .map(({ category, keycaps: inRow }, row) => {
      let start = 0;
      const keys = inRow.map((keycap): PlacedKey => {
        const width = keycap.row === "also" ? alsoKeyWidth : 1;
        const placed = { keycap, row, start, width };
        start += width;
        return placed;
      });
      return { category, keys };
    });

  const width = Math.max(
    1,
    ...rows.map(({ keys }) => keys.reduce((sum, key) => sum + key.width, 0)),
  );
  return { rows, width };
}

function placed(layout: KeyboardLayout, keycap: Keycap): PlacedKey {
  const key = layout.rows.flatMap(({ keys }) => keys).find((key) => key.keycap.id === keycap.id);
  if (!key) throw new Error(`Keycap ${keycap.id} is not on the keyboard.`);
  return key;
}

/**
 * Where a keycap sits on the plate, for its sound (P3-T13): `x` from -1 (left edge) through 0 (centre) to 1 (right
 * edge), measured at the keycap's middle; `y` from 0 (back row) to 1 (front row).
 */
export function keyPosition(keycaps: Keycap[], keycap: Keycap): { x: number; y: number } {
  const layout = keyboardLayout(keycaps);
  const { row, start, width } = placed(layout, keycap);
  const rows = layout.rows.length;

  return {
    x: ((start + width / 2) / layout.width) * 2 - 1,
    y: rows === 1 ? 1 : row / (rows - 1),
  };
}

/**
 * How far apart two keycaps are, middle to middle, in main keycap widths: how late the light ripple reaches one
 * (P3-T14).
 */
export function keyDistance(keycaps: Keycap[], from: Keycap, to: Keycap): number {
  const layout = keyboardLayout(keycaps);
  const a = placed(layout, from);
  const b = placed(layout, to);
  return Math.hypot(a.start + a.width / 2 - (b.start + b.width / 2), (a.row - b.row) * rowPitch);
}
