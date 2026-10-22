import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormField } from "./FormField";

describe("FormField", () => {
  it("labels a text input", () => {
    render(<FormField label="Name" name="name" />);

    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("name", "name");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("marks an error and reads the hint and the error as the description", () => {
    render(
      <FormField
        label="Email"
        name="email"
        type="email"
        hint="Only used to reply."
        error="Enter a valid email."
      />,
    );

    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Only used to reply. Enter a valid email.");
  });

  it("renders a textarea when multiline, without leaking the prop to the DOM", () => {
    render(<FormField multiline label="Message" name="message" />);

    const textarea = screen.getByRole("textbox", { name: "Message" });
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea).not.toHaveAttribute("multiline");
  });

  it("gives two fields with the same name their own ids", () => {
    render(
      <>
        <FormField label="Contact email" name="email" />
        <FormField label="Newsletter email" name="email" />
      </>,
    );

    const contact = screen.getByRole("textbox", { name: "Contact email" });
    const newsletter = screen.getByRole("textbox", { name: "Newsletter email" });
    expect(contact.id).not.toBe(newsletter.id);
  });
});
