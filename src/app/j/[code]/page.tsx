import { redirect } from "next/navigation";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * Short-link compatibility route: /j/<invite-code>
 * Forwards to the canonical join flow at /join?code=<code>.
 * All join logic (auth guard, form handling) lives on /join to avoid split paths.
 */
export default async function ShortLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect(`/join?code=${encodeURIComponent(code.toUpperCase())}`);
}
