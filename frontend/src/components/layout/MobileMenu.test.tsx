import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MobileMenu } from "./MobileMenu";

function renderMenu() {
  render(
    <MobileMenu label="Menu">
      <a href="#blog">Blog</a>
    </MobileMenu>,
  );
  return screen.getByRole("button", { name: "Menu" });
}

describe("MobileMenu", () => {
  it("starts closed, with the links hidden", () => {
    const button = renderMenu();

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Blog" })).not.toBeInTheDocument();
  });

  it("opens the panel the button controls", () => {
    const button = renderMenu();

    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    const link = screen.getByRole("link", { name: "Blog" });
    expect(link.parentElement).toHaveAttribute("id", button.getAttribute("aria-controls"));
  });

  it("closes on Escape and puts focus back on the button", () => {
    const button = renderMenu();
    fireEvent.click(button);
    screen.getByRole("link", { name: "Blog" }).focus();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveFocus();
  });

  it("closes when a link is followed", () => {
    const button = renderMenu();
    fireEvent.click(button);

    fireEvent.click(screen.getByRole("link", { name: "Blog" }));

    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});
