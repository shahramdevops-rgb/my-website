import { notFound } from "next/navigation";

// Any path under a language that no other route matches (/fa/no-such-page) lands here and becomes a 404 *inside*
// the [locale] layout: the visitor gets the localized not-found.tsx with the header and footer, in their language.
// Without this route Next would show the root app/not-found.tsx, which knows no language.
export default function CatchAllPage() {
  notFound();
}
