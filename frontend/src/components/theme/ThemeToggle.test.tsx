import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { themeStorageKey } from "@/lib/theme/theme";
import { ThemeToggle } from "./ThemeToggle";

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
  localStorage.clear();
});

describe("ThemeToggle", () => {
  it("is pressed in the default dark theme", () => {
    render(<ThemeToggle label="Dark theme" />);

    expect(screen.getByRole("button", { name: "Dark theme" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("switches to light, saves the choice and reports it", async () => {
    render(<ThemeToggle label="Dark theme" />);

    fireEvent.click(screen.getByRole("button", { name: "Dark theme" }));

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem(themeStorageKey)).toBe("light");
    expect(await screen.findByRole("button", { pressed: false })).toBeInTheDocument();
  });

  it("starts unpressed when the pre-paint script already applied a saved light theme", () => {
    localStorage.setItem(themeStorageKey, "light");
    document.documentElement.dataset.theme = "light";

    render(<ThemeToggle label="Dark theme" />);

    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });
});
