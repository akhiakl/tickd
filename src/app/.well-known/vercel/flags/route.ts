import { getProviderData, createFlagsDiscoveryEndpoint } from "flags/next";
import { auth0Enabled } from "@/lib/flags";

/**
 * Lets the Vercel dashboard/Toolbar discover and (once `FLAGS_SECRET` is
 * set in the project's env vars) override this app's flags. Works without
 * that secret too - it just means override signing isn't available yet;
 * `auth0Enabled`'s own `decide()` still reads `AUTH0_ENABLED` either way.
 */
export const GET = createFlagsDiscoveryEndpoint(async () => {
  return getProviderData({ auth0Enabled });
});
