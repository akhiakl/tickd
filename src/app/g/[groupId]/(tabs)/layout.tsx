import { BottomNav } from "@/components/nav/bottom-nav";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function GroupTabsLayout({ children, params }: LayoutProps<"/g/[groupId]">) {
  const { groupId } = await params;
  return (
    // h-dvh (not min-h-dvh) + overflow-hidden caps this at exactly one
    // viewport tall: without a hard cap, this div (and Screen's own
    // ancestor wrapper, which is also min-h-dvh) just grows to fit its
    // content, so the *page* scrolls instead of the div below - and
    // BottomNav, a flex-none sibling of that div rather than a child of
    // it, scrolls away with everything else instead of staying put.
    // Capping the height here is what makes flex-1/overflow-y-auto below
    // actually engage as an internal scroll region, which is the only
    // thing that keeps BottomNav genuinely pinned in view.
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="no-scrollbar flex-1 overflow-y-auto">{children}</div>
      <BottomNav groupId={groupId} />
    </div>
  );
}
