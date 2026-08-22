import { BottomNav } from "@/components/nav/bottom-nav";

export default async function GroupTabsLayout({ children, params }: LayoutProps<"/g/[groupId]">) {
  const { groupId } = await params;
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="no-scrollbar flex-1 overflow-y-auto">{children}</div>
      <BottomNav groupId={groupId} />
    </div>
  );
}
