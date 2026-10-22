import { describe, expect, it } from "vitest";
import { buildKeycaps, keyboardLayout } from "./keycaps";

const tech = (id: string, name: string) => ({ id, name, description: `${name} description` });

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
      experience: [],
    });

    expect(keycaps.map(({ key }) => key)).toEqual(["A", "B", "C", "D"]);
  });

  it("uses digits once every letter is taken and leaves out what has no key", () => {
    const techStack = Array.from({ length: 40 }, (_, index) => tech(`t${index}`, "#"));

    const keycaps = buildKeycaps({ techStack, experience: [] });

    expect(keycaps).toHaveLength(36);
    expect(keycaps.at(26)).toMatchObject({ key: "0", code: "Digit0" });
    expect(keycaps.at(-1)).toMatchObject({ key: "9", code: "Digit9" });
  });

  it("lists the résumé entries that used each technology, in résumé order", () => {
    const keycaps = buildKeycaps({
      techStack: [tech("csharp", "C#"), tech("react", "React")],
      experience: [experience("Gym", ["csharp", "react"]), experience("Cinema", ["csharp"])],
    });

    expect(keycaps[0]?.usedIn).toEqual([
      { organization: "Gym", role: "Gym role" },
      { organization: "Cinema", role: "Cinema role" },
    ]);
    expect(keycaps[1]?.usedIn).toEqual([{ organization: "Gym", role: "Gym role" }]);
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
