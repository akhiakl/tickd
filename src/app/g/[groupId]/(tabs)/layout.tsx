// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * Previously this wrapped `children` in an h-dvh/overflow-hidden shell
 * whose only job was making BottomNav (a flex-none sibling) stay pinned
 * to the viewport bottom while the content above it scrolled internally.
 * GroupNav (rendered once, from GroupTabHeader) now handles that itself
 * with `position: fixed` - which pins it to the viewport regardless of
 * where in the DOM it's declared or how the page scrolls - so this shell
 * isn't needed any more: ordinary document flow/scrolling is simpler and
 * has no other reason not to be the default here.
 */
export default function GroupTabsLayout({ children }: LayoutProps<"/g/[groupId]">) {
  return <>{children}</>;
}
