import { getNonce } from "@/lib/security/nonce";
import { themeScript } from "@/lib/theme/theme";

/**
 * The pre-paint theme script, in <head> (rules.md §9: our only inline script). It carries this request's nonce,
 * so the CSP lets it run. suppressHydrationWarning: browsers hide the nonce attribute after parsing, so the DOM
 * no longer matches what React rendered — expected, not a bug.
 */
export async function ThemeScript() {
  const nonce = await getNonce();

  return (
    <script
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: themeScript }}
    />
  );
}
