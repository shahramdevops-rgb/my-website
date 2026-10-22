import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("is a plain button by default, so it never submits a form by accident", () => {
    render(<Button>Open</Button>);

    expect(screen.getByRole("button", { name: "Open" })).toHaveAttribute("type", "button");
  });

  it("can submit a form", () => {
    render(<Button type="submit">Send</Button>);

    expect(screen.getByRole("button", { name: "Send" })).toHaveAttribute("type", "submit");
  });

  it("keeps a caller's classes next to its own", () => {
    render(
      <Button variant="ghost" className="w-full">
        Wide
      </Button>,
    );

    expect(screen.getByRole("button")).toHaveClass("w-full", "border-border", "rounded-full");
  });
});
