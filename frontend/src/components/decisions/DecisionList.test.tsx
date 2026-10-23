import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import fa from "../../../messages/fa.json";
import { Decision, DecisionList } from "./DecisionList";
import { Challenge, Choice, Why } from "./DecisionParts";

describe("Decision", () => {
  it.each([
    ["en", en, ["Challenge", "Decision", "Why"]],
    ["fa", fa, ["چالش", "تصمیم", "چرا"]],
  ] as const)(
    "is an article named by its heading, with three labelled parts (%s)",
    (locale, messages, labels) => {
      render(
        <NextIntlClientProvider locale={locale} messages={messages}>
          <DecisionList>
            <Decision project="Project X" title="A title">
              <Challenge>The problem</Challenge>
              <Choice>The choice</Choice>
              <Why>The reason</Why>
            </Decision>
          </DecisionList>
        </NextIntlClientProvider>,
      );

      const card = screen.getByRole("article", { name: "A title" });
      expect(within(card).getByRole("heading", { level: 2 })).toHaveTextContent("A title");
      expect(
        within(card)
          .getAllByRole("term")
          .map((term) => term.textContent),
      ).toEqual(labels);
      expect(
        within(card)
          .getAllByRole("definition")
          .map((part) => part.textContent),
      ).toEqual(["The problem", "The choice", "The reason"]);
      // Screen readers hear what the line above the heading is.
      expect(within(card).getByText(/Project X$/).textContent).toBe(
        `${messages.decisions.project} Project X`,
      );
    },
  );
});
