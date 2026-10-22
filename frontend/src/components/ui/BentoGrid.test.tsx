import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BentoCard } from "./BentoCard";
import { BentoGrid } from "./BentoGrid";

type Device = { reducedMotion: boolean; finePointer: boolean };

// jsdom has no media queries: answer them from a fake device, and keep the "change" listeners so a test can
// flip a setting the way the OS would.
let device: Device;
let changeListeners: (() => void)[];

function matchesQuery(query: string): boolean {
  const motionOk =
    !query.includes("prefers-reduced-motion: no-preference") || !device.reducedMotion;
  const pointerOk = !query.includes("pointer: fine") || device.finePointer;
  return motionOk && pointerOk;
}

beforeEach(() => {
  device = { reducedMotion: false, finePointer: true };
  changeListeners = [];
  vi.stubGlobal("matchMedia", (query: string) => ({
    media: query,
    get matches() {
      return matchesQuery(query);
    },
    addEventListener: (_: string, listener: () => void) => changeListeners.push(listener),
    removeEventListener: () => {},
  }));
  // Run the once-per-frame update immediately.
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderGrid() {
  render(
    <BentoGrid className="test-grid">
      <BentoCard>
        <p>Card</p>
      </BentoCard>
    </BentoGrid>,
  );
  const card = screen.getByText("Card").parentElement as HTMLElement;
  const grid = card.parentElement as HTMLElement;
  // jsdom does no layout: place the card at (100, 50) on screen.
  vi.spyOn(card, "getBoundingClientRect").mockReturnValue({ left: 100, top: 50 } as DOMRect);
  return { grid, card };
}

describe("BentoGrid spotlight", () => {
  it("writes the cursor position relative to each card", () => {
    const { grid, card } = renderGrid();

    fireEvent.pointerMove(grid, { clientX: 130, clientY: 70, pointerType: "mouse" });

    expect(grid).toHaveAttribute("data-spotlight");
    expect(card.style.getPropertyValue("--x")).toBe("30px");
    expect(card.style.getPropertyValue("--y")).toBe("20px");
  });

  it("is off with reduced motion: no glow attribute and no listener", () => {
    device.reducedMotion = true;
    const { grid, card } = renderGrid();

    fireEvent.pointerMove(grid, { clientX: 130, clientY: 70, pointerType: "mouse" });

    expect(grid).not.toHaveAttribute("data-spotlight");
    expect(card.style.getPropertyValue("--x")).toBe("");
  });

  it("is off on a touch screen", () => {
    device.finePointer = false;
    const { grid } = renderGrid();

    expect(grid).not.toHaveAttribute("data-spotlight");
  });

  it("ignores touch pointers on a device that has a mouse too", () => {
    const { grid, card } = renderGrid();

    fireEvent.pointerMove(grid, { clientX: 130, clientY: 70, pointerType: "touch" });

    expect(card.style.getPropertyValue("--x")).toBe("");
  });

  it("switches off when reduced motion is turned on while the page is open", async () => {
    const { grid } = renderGrid();
    expect(grid).toHaveAttribute("data-spotlight");

    device.reducedMotion = true;
    changeListeners.forEach((listener) => listener());

    await vi.waitFor(() => expect(grid).not.toHaveAttribute("data-spotlight"));
  });
});
