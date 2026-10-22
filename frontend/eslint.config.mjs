import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Last: turns off every stylistic rule Prettier owns, so the two tools never disagree.
  prettier,
  {
    rules: {
      // rules.md §9: no `any`, and no `!` without a comment (disable the rule on that line and say why).
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      // `const { omitted, ...rest } = props` is how a key is dropped before spreading the rest onto an element.
      "@typescript-eslint/no-unused-vars": ["warn", { ignoreRestSiblings: true }],
    },
  },
  globalIgnores([".next/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
]);
