import type { ReactNode } from "react";

// Pass-through root layout: it exists only because app/not-found.tsx needs a layout above it.
// The real <html> (with lang and dir) is rendered per language in app/[locale]/layout.tsx.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
