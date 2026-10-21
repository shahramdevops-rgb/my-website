import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// `server-only` throws when imported outside Next's server build; tests run server modules directly.
vi.mock("server-only", () => ({}));

// Unmount what each test rendered, so tests never see each other's DOM.
afterEach(() => {
  cleanup();
});
