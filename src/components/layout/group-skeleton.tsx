/**
 * Shared shape for both `loading.tsx` files under `src/app/g/[groupId]`:
 * a stand-in for the header + stats panel + checklist/member-list rows
 * that every screen in a group (Today, Wall, Ranks, Settings, member
 * profile) roughly shares. It doesn't need to match any one screen
 * exactly - it just needs to appear the instant a navigation starts,
 * instead of the blank white-until-the-server-responds gap there was
 * before.
 */
export function GroupSkeleton({ header = false, rows = 5 }: { header?: boolean; rows?: number }) {
  return (
    <div className="px-6 pt-3 pb-10">
      {header && (
        <div className="mb-6 flex items-center gap-2.5">
          <div className="skeleton h-9 w-9 rounded-full" />
          <div className="skeleton h-5 w-28 rounded-full" />
        </div>
      )}
      <div className="skeleton h-24 rounded-3xl" />
      <div className="mt-6 flex flex-col gap-2">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="skeleton h-14 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
