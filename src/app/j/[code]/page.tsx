import { redirect } from "next/navigation";

/**
 * Short-link compatibility route: /j/<invite-code>
 * Forwards to the canonical join flow at /join?code=<code>.
 * All join logic (auth guard, form handling) lives on /join to avoid split paths.
 */
export default async function ShortLinkPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect(`/join?code=${encodeURIComponent(code.toUpperCase())}`);
}
