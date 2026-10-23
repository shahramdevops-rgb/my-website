// Email obfuscation (P3-T7). Address harvesters read the HTML a server sends and look for `name@domain` or
// `mailto:`; few of them run JavaScript. So the server sends the address as reversed character codes (also what
// ends up in the RSC payload inside the HTML), and EmailLink rebuilds it in the browser after hydration.
// It stops cheap scrapers, not a determined person — the address is public on purpose.

/** `a@b.c` → the character codes of `c.b@a`. */
export function encodeEmail(address: string): number[] {
  return Array.from(address, (character) => character.codePointAt(0) ?? 0).reverse();
}

/** The inverse of {@link encodeEmail}. */
export function decodeEmail(encoded: readonly number[]): string {
  return String.fromCodePoint(...[...encoded].reverse());
}

/** `name@example.com` → `{ user: "name", domain: "example.com" }`, for the readable no-JavaScript fallback. */
export function splitEmail(address: string): { user: string; domain: string } {
  const at = address.lastIndexOf("@");
  return { user: address.slice(0, at), domain: address.slice(at + 1) };
}
