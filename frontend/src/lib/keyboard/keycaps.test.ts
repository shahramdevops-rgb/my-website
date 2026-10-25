import { describe, expect, it } from "vitest";
import {
  buildKeycaps,
  keyboardLayout,
  alsoKeyWidth,
  keyDistance,
  keyPosition,
  type TechCategory,
} from "./keycaps";

const tech = (id: string, name: string, category: TechCategory = "backend") => ({
  id,
  name,
  description: `${name} description`,
  category,
});

const experience = (organization: string, techIds: string[]) => ({
  organization,
  role: `${organization} role`,
  start: "2020-01",
  summary: "",
  highlights: [],
  tech: techIds,
});

describe("buildKeycaps", () => {
  it("gives each technology the first free letter of its name", () => {
    const keycaps = buildKeycaps({
      techStack: [
        tech("csharp", "C#"),
        tech("dotnet", ".NET"),
        tech("nextjs", "Next.js"),
        tech("docker", "Docker"),
      ],
      alsoUsed: [],
      experience: [],
    });

    expect(keycaps.map(({ key, code }) => [key, code])).toEqual([
      ["C", "KeyC"],
      ["N", "KeyN"],
      // N is taken by .NET, E is the next letter of "Next.js".
      ["E", "KeyE"],
      ["D", "KeyD"],
    ]);
  });

  it("falls back to the first free letter, then a digit, when the name has none left", () => {
    const keycaps = buildKeycaps({
      techStack: [tech("a", "A"), tech("b", "B"), tech("ab", "AB"), tech("hash", "#")],
      alsoUsed: [],
      experience: [],
    });

    expect(keycaps.map(({ key }) => key)).toEqual(["A", "B", "C", "D"]);
  });

  it("uses digits once every letter is taken and leaves out what has no key", () => {
    const techStack = Array.from({ length: 40 }, (_, index) => tech(`t${index}`, "#"));

    const keycaps = buildKeycaps({ techStack, alsoUsed: [], experience: [] });

    expect(keycaps).toHaveLength(36);
    expect(keycaps.at(26)).toMatchObject({ key: "0", code: "Digit0" });
    expect(keycaps.at(-1)).toMatchObject({ key: "9", code: "Digit9" });
  });

  it("lists the résumé entries that used each technology, in résumé order", () => {
    const keycaps = buildKeycaps({
      techStack: [tech("csharp", "C#"), tech("react", "React")],
      alsoUsed: [],
      experience: [experience("Gym", ["csharp", "react"]), experience("Cinema", ["csharp"])],
    });

    expect(keycaps[0]?.usedIn).toEqual([
      { organization: "Gym", role: "Gym role" },
      { organization: "Cinema", role: "Cinema role" },
    ]);
    expect(keycaps[1]?.usedIn).toEqual([{ organization: "Gym", role: "Gym role" }]);
  });
});

describe("buildKeycaps categories", () => {
  it("keeps each technology's category on its keycap", () => {
    const keycaps = buildKeycaps({
      techStack: [tech("csharp", "C#"), tech("react", "React", "frontend")],
      alsoUsed: [tech("redis", "Redis", "database"), tech("nginx", "Nginx", "devops")],
      experience: [],
    });

    expect(keycaps.map(({ id, category }) => [id, category])).toEqual([
      ["csharp", "backend"],
      ["react", "frontend"],
      ["redis", "database"],
      ["nginx", "devops"],
    ]);
  });
});

describe("buildKeycaps with alsoUsed", () => {
  it("puts the main stack first, so it gets the first pick of letters, and marks each key's row", () => {
    const keycaps = buildKeycaps({
      techStack: [tech("postgresql", "PostgreSQL"), tech("react", "React")],
      alsoUsed: [tech("python", "Python"), tech("redis", "Redis")],
      experience: [experience("Shop", ["python"])],
    });

    expect(keycaps.map(({ id, key, row }) => [id, key, row])).toEqual([
      ["postgresql", "P", "main"],
      ["react", "R", "main"],
      // P and R are taken by the main stack.
      ["python", "Y", "also"],
      ["redis", "E", "also"],
    ]);
    expect(keycaps[2]?.usedIn).toEqual([{ organization: "Shop", role: "Shop role" }]);
  });
});

describe("keyboardLayout", () => {
  // The site's real mix: main keys and narrower "also" keys in all four categories.
  const keycaps = buildKeycaps({
    techStack: [
      tech("csharp", "C#"),
      tech("postgresql", "PostgreSQL", "database"),
      tech("react", "React", "frontend"),
      tech("docker", "Docker", "devops"),
      tech("dotnet", ".NET"),
    ],
    alsoUsed: [
      tech("python", "Python"),
      tech("mysql", "MySQL", "database"),
      tech("git", "Git", "devops"),
      tech("nginx", "Nginx", "devops"),
    ],
    experience: [],
  });
  const layout = keyboardLayout(keycaps);
  const byId = (id: string) => {
    const keycap = keycaps.find((candidate) => candidate.id === id);
    if (!keycap) throw new Error(`No keycap ${id}`);
    return keycap;
  };

  it("gives each category one row, in the legend's order, main keys first", () => {
    expect(
      layout.rows.map(({ category, keys }) => [category, keys.map(({ keycap }) => keycap.id)]),
    ).toEqual([
      ["backend", ["csharp", "dotnet", "python"]],
      ["frontend", ["react"]],
      ["database", ["postgresql", "mysql"]],
      ["devops", ["docker", "git", "nginx"]],
    ]);
  });

  it("makes the also keys narrower and the plate as wide as the longest row", () => {
    const backend = layout.rows[0]?.keys ?? [];

    expect(backend.map(({ start, width }) => [start, width])).toEqual([
      [0, 1],
      [1, 1],
      [2, alsoKeyWidth],
    ]);
    expect(layout.width).toBeCloseTo(2 + alsoKeyWidth);
  });

  it("leaves out categories without technologies", () => {
    const onlyBackend = buildKeycaps({
      techStack: [tech("csharp", "C#")],
      alsoUsed: [],
      experience: [],
    });

    expect(keyboardLayout(onlyBackend)).toMatchObject({
      rows: [{ category: "backend" }],
      width: 1,
    });
  });

  it("places keys across the plate (-1 … 1, at their middle) and from the back row (0) to the front (1)", () => {
    expect(keyPosition(keycaps, byId("csharp"))).toEqual({ x: (0.5 / layout.width) * 2 - 1, y: 0 });
    expect(keyPosition(keycaps, byId("react")).y).toBeCloseTo(1 / 3);
    expect(keyPosition(keycaps, byId("nginx")).y).toBe(1);
    expect(keyPosition(keycaps, byId("python")).x).toBeGreaterThan(
      keyPosition(keycaps, byId("dotnet")).x,
    );
  });

  it("measures the light ripple's distance in keys, middle to middle", () => {
    expect(keyDistance(keycaps, byId("csharp"), byId("csharp"))).toBe(0);
    expect(keyDistance(keycaps, byId("csharp"), byId("dotnet"))).toBe(1);
    // React is right below C#, one row on.
    const down = keyDistance(keycaps, byId("csharp"), byId("react"));
    expect(down).toBeGreaterThan(0);
    expect(down).toBeLessThan(1);
    expect(keyDistance(keycaps, byId("csharp"), byId("nginx"))).toBeGreaterThan(down);
  });
});
