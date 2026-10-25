// The keyboard hero's data (P3-T3): one keycap per technology of the résumé (ADR-013), each with the real key that
// presses it and the résumé entries that used it. The main stack (`techStack`) gets the big keys; what was also used
// (`alsoUsed`, P3-T10) a smaller row above them. Pure functions, shared by the server (which builds
// the keycaps) and the browser (poster, 3D scene and accessible list all read the same array).
import type { Resume } from "@/lib/resume/get-resume";

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
    });
  }

  return keycaps;
}

/** The keycaps of one row group, in résumé order. */
export function keycapsIn(keycaps: Keycap[], row: KeycapRow): Keycap[] {
  return keycaps.filter((keycap) => keycap.row === row);
}

/**
 * The grid the main keycaps sit in, the same for the poster and the 3D scene: at most 4 per row, rows as even as
 * possible (8 → 4 × 2, 5 → 3 + 2, 3 → one row of 3). The `also` keys are one row above it, as wide as the grid.
 */
export function keyboardLayout(count: number): { columns: number; rows: number } {
  const rows = Math.max(1, Math.ceil(count / 4));
  return { columns: Math.max(1, Math.ceil(count / rows)), rows };
}
