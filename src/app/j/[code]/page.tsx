import { redirect } from "next/navigation";

// A bare redirect - no UI, nothing to prerender as a shell or stream in, so
// there's no benefit to chasing instant navigation validation here.
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
