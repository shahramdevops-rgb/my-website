import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildKeycaps } from "@/lib/keyboard/keycaps";
import { KeyboardHero } from "./KeyboardHero";

const keycaps = buildKeycaps({
  techStack: [
    { id: "csharp", name: "C#", description: "C# description" },
    { id: "react", name: "React", description: "React description" },
  ],
  experience: [
    {
      organization: "Gym",
      role: "Lead developer",
      start: "2020-01",
      summary: "",
      highlights: [],
      tech: ["csharp"],
    },
  ],
});

const labels = { hint: "Hint", usedIn: "Used in", noProjects: "No projects yet" };

// jsdom has no matchMedia and no WebGL: the hero shows the poster, never the 3D scene.
beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    media: query,
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

function renderHero() {
  render(<KeyboardHero keycaps={keycaps} labels={labels} />);
  return {
    csharp: screen.getByRole("button", { name: "C#" }),
    react: screen.getByRole("button", { name: "React" }),
  };
}

/** The element a keycap button opens: its aria-controls target. */
function cardOf(button: HTMLElement) {
  const card = document.getElementById(button.getAttribute("aria-controls") ?? "");
  if (!card) throw new Error("The button controls no element.");
  return card;
}

describe("KeyboardHero", () => {
  it("names each button by its technology and announces its key as a shortcut", () => {
    const { csharp, react } = renderHero();

    expect(csharp).toHaveAttribute("aria-keyshortcuts", "C");
    expect(react).toHaveAttribute("aria-keyshortcuts", "R");
    expect(csharp).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the card of the button pressed, with the résumé entries that used it", () => {
    const { csharp } = renderHero();

    fireEvent.click(csharp);

    expect(csharp).toHaveAttribute("aria-expanded", "true");
    const card = cardOf(csharp);
    expect(within(card).getByRole("heading", { name: "C#" })).toBeInTheDocument();
    expect(within(card).getByText("C# description")).toBeInTheDocument();
    expect(within(card).getByText("Gym")).toBeInTheDocument();
    expect(within(card).getByText("Lead developer")).toBeInTheDocument();
  });

  it("says so when no résumé entry used the technology", () => {
    const { react } = renderHero();

    fireEvent.click(react);

    expect(within(cardOf(react)).getByText("No projects yet")).toBeInTheDocument();
  });

  it("closes the card when the same button is pressed again", () => {
    const { csharp } = renderHero();

    fireEvent.click(csharp);
    fireEvent.click(csharp);

    expect(csharp).toHaveAttribute("aria-expanded", "false");
    expect(cardOf(csharp)).toBeEmptyDOMElement();
  });

  it("opens a card from its real key while focus is in the list, and closes it on Escape", () => {
    const { csharp, react } = renderHero();
    csharp.focus();

    // `code` is the physical key: the same on a Persian layout, where `key` would be a Persian letter.
    fireEvent.keyDown(csharp, { code: "KeyR", key: "ق" });
    fireEvent.keyUp(csharp, { code: "KeyR", key: "ق" });

    expect(react).toHaveAttribute("aria-expanded", "true");
    expect(within(cardOf(react)).getByRole("heading", { name: "React" })).toBeInTheDocument();

    fireEvent.keyDown(csharp, { code: "Escape", key: "Escape" });

    expect(react).toHaveAttribute("aria-expanded", "false");
  });

  it("ignores letters typed outside the keyboard and shortcuts with a modifier", () => {
    const { csharp } = renderHero();

    fireEvent.keyDown(document.body, { code: "KeyC", key: "c" });
    expect(csharp).toHaveAttribute("aria-expanded", "false");

    csharp.focus();
    fireEvent.keyDown(csharp, { code: "KeyC", key: "c", ctrlKey: true });
    expect(csharp).toHaveAttribute("aria-expanded", "false");
  });
});
