import type { Locale } from "@/lib/i18n/config";
import type messages from "../../messages/en.json";

// Teaches next-intl our locales and message keys: t("notFound.titel") or a locale "de" fails `pnpm typecheck`.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
