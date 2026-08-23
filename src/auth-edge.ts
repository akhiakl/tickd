import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

/**
 * Middleware-only Auth.js instance (see src/proxy.ts). `providers: []` is
 * deliberate, not a placeholder to fill in later - middleware only ever
 * asks "is there a valid session," which doesn't touch providers, so this
 * file's import graph never reaches Auth0, Credentials, or `@/server/db`.
 * The full instance with real providers lives in src/auth.ts.
 */
export const { auth } = NextAuth({ ...authConfig, providers: [] });
