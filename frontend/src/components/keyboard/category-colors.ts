import type { TechCategory } from "@/lib/keyboard/keycaps";

/**
 * Each category's color classes (P3-T12, tokens in globals.css). Whole class names, never built from parts: Tailwind
 * finds the classes it generates by scanning the source for complete names.
 */
export const categoryColors: Record<TechCategory, { body: string; mark: string }> = {
  backend: { body: "bg-cat-backend-soft", mark: "bg-cat-backend" },
  frontend: { body: "bg-cat-frontend-soft", mark: "bg-cat-frontend" },
  database: { body: "bg-cat-database-soft", mark: "bg-cat-database" },
  devops: { body: "bg-cat-devops-soft", mark: "bg-cat-devops" },
};
