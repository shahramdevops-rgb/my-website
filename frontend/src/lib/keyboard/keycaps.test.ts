import { describe, expect, it } from "vitest";
import { buildKeycaps, keyboardLayout, keyPosition, type TechCategory } from "./keycaps";

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
  it.each([
    [1, 1, 1],
    [3, 3, 1],
    [4, 4, 1],
    [5, 3, 2],
    [8, 4, 2],
    [10, 4, 3],
  ])("puts %i keycaps in %i columns and %i rows", (count, columns, rows) => {
    expect(keyboardLayout(count)).toEqual({ columns, rows });
  });
});

describe("keyPosition", () => {
  it("places keys across the plate (-1 … 1) and from the back row (0) to the front row (1)", () => {
    const keycaps = buildKeycaps({
      techStack: ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => tech(id, id.toUpperCase())),
      alsoUsed: [tech("p", "P"), tech("q", "Q"), tech("r", "R"), tech("s", "S"), tech("t", "T")],
      experience: [],
    });
    const at = (id: string) => {
      const keycap = keycaps.find((candidate) => candidate.id === id);
      if (!keycap) throw new Error(`No keycap ${id}`);
      return keyPosition(keycaps, keycap);
    };

    // 4 columns; also rows: P Q R S / T; main rows: A B C D / E F G H — four rows in all.
    expect(at("p")).toEqual({ x: -1, y: 0 });
    expect(at("s")).toEqual({ x: 1, y: 0 });
    expect(at("t").y).toBeCloseTo(1 / 3);
    expect(at("b").x).toBeCloseTo(-1 / 3);
    expect(at("a").y).toBeCloseTo(2 / 3);
    expect(at("h")).toEqual({ x: 1, y: 1 });
  });
});
