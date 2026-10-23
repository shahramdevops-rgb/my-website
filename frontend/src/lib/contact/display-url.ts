/** `https://github.com/name/` → `github.com/name`: a profile URL as a short, readable link text. */
export function displayUrl(url: string): string {
  const { host, pathname } = new URL(url);
  return `${host}${pathname}`.replace(/\/+$/, "");
}
