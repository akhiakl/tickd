import { describe, expect, it, vi, afterEach } from "vitest";
import { getBaseUrl } from "./base-url";

// vi.stubEnv, not a direct process.env assignment: NODE_ENV is typed
// read-only (Next.js's own env typings), and vi.unstubAllEnvs() in
// afterEach restores every var this stubs in one place regardless.
describe("getBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers NEXT_PUBLIC_APP_URL over everything else", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://127.0.0.1:3100");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL", "example.vercel.app");
    expect(getBaseUrl()).toBe("http://127.0.0.1:3100");
  });

  it("falls back to localhost:3000 in development", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(getBaseUrl()).toBe("http://localhost:3000");
  });

  it("prefers the stable production domain over the deployment URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL", "tickd.example");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "tickd-git-preview.vercel.app");
    expect(getBaseUrl()).toBe("https://tickd.example");
  });

  it("falls back to the deployment URL when no production domain is set", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "tickd-git-preview.vercel.app");
    expect(getBaseUrl()).toBe("https://tickd-git-preview.vercel.app");
  });

  it("falls back to localhost:3000 when nothing at all is set (Vitest, CI)", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "");
    expect(getBaseUrl()).toBe("http://localhost:3000");
  });
});
