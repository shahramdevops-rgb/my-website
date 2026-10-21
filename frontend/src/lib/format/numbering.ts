import type { Locale } from "@/lib/i18n/config";

/** Digits per locale, chosen by Intl: fa → Persian (`۱۲۳`, "arabext"), en → Latin (`123`). */
export const numberingSystems: Record<Locale, string> = { fa: "arabext", en: "latn" };
