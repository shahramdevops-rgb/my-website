import type { Metadata } from "next";
import type { ReactNode } from "react";

// Placeholder until P2-T6 adds the [locale] segment: one fixed language, title from P2-T4's /api/site.
export const metadata: Metadata = {
  title: "Mahdi Azghandi",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
