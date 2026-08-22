import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const TEST_GLOBS = [
  "**/*.test.{ts,tsx}",
  "**/*.spec.{ts,tsx}",
  "**/__tests__/**/*.{ts,tsx}",
  "vitest.config.ts",
  "vitest.setup.ts",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Every non-test source file stays under 300 lines. Split a file that
      // grows past this into smaller, focused modules instead of disabling
      // the rule.
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: TEST_GLOBS,
    rules: {
      // Test files get a larger ceiling (500 lines) since fixtures and
      // table-driven cases add bulk without adding complexity.
      "max-lines": ["error", { max: 500, skipBlankLines: true, skipComments: true }],
    },
  },
  // Default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "design/**",
    "drizzle/**",
    "coverage/**",
  ]),
]);

export default eslintConfig;
