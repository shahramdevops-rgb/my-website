// Entry point for all page JavaScript. _Layout loads it as an ES module: modules are deferred (they run after
// the HTML is parsed) and the imports below are fetched from our own origin, so the CSP's script-src 'self' covers them.
//
// Alpine CSP build (ADR-007, architecture.md §8): it never evaluates attribute strings as code, so markup can only
// reference components registered here by name (x-data="mobileMenu"), and their properties and methods.
import Alpine from "../lib/alpine-3.17.4/alpine-csp.esm.min.js";
import mobileMenu from "./components/mobile-menu.js";
import themeToggle from "./components/theme-toggle.js";
import theme from "./stores/theme.js";

Alpine.store("theme", theme);
Alpine.data("mobileMenu", mobileMenu);
Alpine.data("themeToggle", themeToggle);

// Register everything first, then start: Alpine scans the page once, so a component registered later would be missed.
Alpine.start();
