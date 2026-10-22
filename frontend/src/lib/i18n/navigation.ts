import { createNavigation } from "next-intl/navigation";
import { routing } from "./config";

// Locale-aware versions of Next's navigation APIs (rules.md §11: never write "/fa" into a link by hand).
// <Link href="/about"> renders /fa/about or /en/about for the current language; usePathname() returns the path
// without the language ("/about"); getPathname() builds the same path for another language.
export const { Link, usePathname, getPathname } = createNavigation(routing);
