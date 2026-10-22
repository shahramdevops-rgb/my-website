import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert } from "./Alert";

describe("Alert", () => {
  it("interrupts for danger", () => {
    render(<Alert variant="danger">Not sent</Alert>);

    expect(screen.getByRole("alert")).toHaveTextContent("Not sent");
  });

  it.each(["info", "success"] as const)("waits for a pause for %s", (variant) => {
    render(
      <Alert variant={variant} title="Saved">
        Done
      </Alert>,
    );

    expect(screen.getByRole("status")).toHaveTextContent("SavedDone");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
