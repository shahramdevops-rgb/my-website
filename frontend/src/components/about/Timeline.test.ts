import { describe, expect, it } from "vitest";
import { timelineSteps } from "./Timeline";

const education = [
  {
    institution: "Shahid Beheshti University",
    degree: "MSc",
    field: "Electrical Engineering",
    start: "2000-01",
  },
  {
    institution: "University of Guilan",
    degree: "BSc",
    field: "Electrical Engineering",
    start: "2000-01",
  },
];
const now = { title: "Software engineering", body: "Full-stack" };

describe("timelineSteps", () => {
  it("lists the résumé's degrees oldest first, then today's work", () => {
    const steps = timelineSteps(education, (degree, field) => `${degree} in ${field}`, now);

    expect(steps.map((step) => step.title)).toEqual([
      "BSc in Electrical Engineering",
      "MSc in Electrical Engineering",
      "Software engineering",
    ]);
    expect(steps.map((step) => step.detail)).toEqual([
      "University of Guilan",
      "Shahid Beheshti University",
      "Full-stack",
    ]);
  });

  it("marks only today's step as current", () => {
    const steps = timelineSteps(education, (degree) => degree, now);

    expect(steps.map((step) => step.current)).toEqual([false, false, true]);
  });

  it("still shows today's step without any education", () => {
    expect(timelineSteps([], (degree) => degree, now)).toHaveLength(1);
  });
});
