import { formatYearMonth } from "@/lib/format/date";
import type { Locale } from "@/lib/i18n/config";

/** The words around the months, from the `resume.period` messages. */
export type PeriodLabels = {
  /** `{start} – {end}` (fa: `{start} تا {end}`). */
  range: (start: string, end: string) => string;
  /** The end of an entry that hasn't ended (`end` = `null`): "Present" (fa: "اکنون"). */
  present: string;
};

/**
 * A résumé entry's dates as one line: `September 2020 – Present`, `شهریور ۱۳۹۹ تا اسفند ۱۴۰۴`. Months come from
 * formatYearMonth (Persian calendar on fa). An entry that starts and ends in the same month shows that month once.
 */
export function formatPeriod(
  start: string,
  end: string | null | undefined,
  locale: Locale,
  labels: PeriodLabels,
): string {
  const from = formatYearMonth(start, locale);
  if (end === start) return from;
  return labels.range(from, end ? formatYearMonth(end, locale) : labels.present);
}
