import localFont from "next/font/local";

// Self-hosted fonts (ADR-007): next/font copies these files into /_next/static/media at build time, so no font
// request leaves the origin. It also writes a size-adjusted fallback face, so the swap causes no layout shift.
// Licences (OFL) stay next to the files in src/fonts/; the version in the folder name documents what we ship.

/** UI and body text, Persian and Latin. One variable file covers every weight from 100 to 900. */
export const vazirmatn = localFont({
  src: "../fonts/vazirmatn-33.003/Vazirmatn-Variable.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-vazirmatn",
  // Shown until the file arrives (after next/font's size-adjusted fallback): Tahoma renders Persian well on Windows.
  fallback: ["Tahoma", "sans-serif"],
});

/** Code. Not preloaded: most pages show no code, so the file is fetched only when a page uses it. */
export const jetbrainsMono = localFont({
  src: [
    { path: "../fonts/jetbrains-mono-2.304/JetBrainsMono-Regular.woff2", weight: "400" },
    { path: "../fonts/jetbrains-mono-2.304/JetBrainsMono-Bold.woff2", weight: "700" },
  ],
  display: "swap",
  variable: "--font-jetbrains-mono",
  preload: false,
  fallback: ["ui-monospace", "Consolas", "monospace"],
});

/** Class names that define both font variables; set on <html>. */
export const fontVariables = `${vazirmatn.variable} ${jetbrainsMono.variable}`;
