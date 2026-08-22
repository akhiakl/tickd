import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    css: false,
    // Playwright owns everything under tests/e2e (its own `test` object,
    // its own runner) - keep Vitest to unit/component tests only.
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
    coverage: {
      provider: "v8",
      // json-summary is what the CI PR-comment builder reads; the rest are
      // for humans (a terminal summary and a browsable report).
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "./coverage",
      // Scoped to the files this project actually unit-tests: the
      // framework-free logic layer (src/lib, validation schemas) plus the
      // handful of components with real state/derivations of their own
      // (optimistic toggles, confirm-flows, sorting, contrast-sensitive
      // class logic). Server actions, route handlers, and purely
      // presentational components (Button, Avatar, Pill, Sheet, ...) are
      // integration-tested by the Playwright suite instead - including
      // them here would just conflate the two strategies into one
      // misleading number.
      include: [
        "src/lib/**/*.ts",
        "src/server/validation/schemas.ts",
        "src/components/wall/wall-grid.tsx",
        "src/components/checklist/checklist-draft-editor.tsx",
        "src/components/settings/checklist-settings-editor.tsx",
        "src/components/settings/danger-zone.tsx",
        "src/components/settings/invite-code-panel.tsx",
        "src/components/settings/members-settings-list.tsx",
        "src/components/today/today-checklist.tsx",
        "src/components/nav/theme-toggle.tsx",
      ],
      exclude: ["**/*.test.{ts,tsx}", "src/lib/fonts.ts", "src/lib/constants.ts"],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // server-only has no runtime content; stub it so server-layer modules
      // (e.g. src/server/queries/users.ts) can be unit-tested under Vitest.
      "server-only": path.resolve(__dirname, "./src/__mocks__/server-only.ts"),
    },
  },
});
