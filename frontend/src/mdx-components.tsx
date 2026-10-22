import type { MDXComponents } from "mdx/types";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Link } from "@/lib/i18n/navigation";

// Required by @next/mdx in the App Router: the elements every content/*.mdx file renders to. The prose itself
// carries no classes (Tailwind scans only src/), so its whole look lives here. Logical spacing only (RTL-safe).
const linkClass = "font-medium text-accent underline underline-offset-4 hover:no-underline";

const components = {
  // A "## heading" looks like any other page section's heading.
  h2: ({ children }) => <SectionHeader title={children} className="mt-16" />,
  h3: ({ children }) => <h3 className="mt-10 text-xl font-bold text-text">{children}</h3>,
  // A comfortable line length for reading; cards that hold prose are narrower anyway.
  p: ({ children }) => <p className="mt-4 max-w-3xl text-muted first:mt-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-text">{children}</strong>,
  ul: ({ children }) => (
    <ul className="mt-4 max-w-3xl list-disc space-y-2 ps-6 text-muted">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-4 max-w-3xl list-decimal space-y-2 ps-6 text-muted">{children}</ol>
  ),
  // "/resume" in the prose becomes /fa/resume or /en/resume: content never names a language (rules.md §11).
  a: ({ href = "", children }) =>
    href.startsWith("/") ? (
      <Link href={href} className={linkClass}>
        {children}
      </Link>
    ) : (
      <a href={href} className={linkClass}>
        {children}
      </a>
    ),
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
