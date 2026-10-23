import { describe, expect, it } from "vitest";
import { formatPeriod, type PeriodLabels } from "./period";

// The same words as resume.period in messages/{en,fa}.json.
const en: PeriodLabels = { range: (start, end) => `${start} – ${end}`, present: "Present" };
const fa: PeriodLabels = { range: (start, end) => `${start} تا ${end}`, present: "اکنون" };

describe("formatPeriod", () => {
  it("joins two months with the language's range words", () => {
    expect(formatPeriod("2020-09", "2026-03", "en", en)).toBe("September 2020 – March 2026");
    expect(formatPeriod("2020-09", "2026-03", "fa", fa)).toBe("شهریور ۱۳۹۹ تا اسفند ۱۴۰۴");
  });

  it.each([null, undefined])("ends with Present when the end is %s", (end) => {
    expect(formatPeriod("2020-09", end, "en", en)).toBe("September 2020 – Present");
    expect(formatPeriod("2020-09", end, "fa", fa)).toBe("شهریور ۱۳۹۹ تا اکنون");
  });

  it("shows a single month once", () => {
    expect(formatPeriod("2000-01", "2000-01", "en", en)).toBe("January 2000");
  });
});
