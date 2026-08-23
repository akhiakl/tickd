import { GroupSkeleton } from "@/components/layout/group-skeleton";

/**
 * Shown while switching between Today/Wall/Ranks - narrower in scope than
 * GroupLoading (src/app/g/[groupId]/loading.tsx): the bottom nav lives in
 * this segment's own layout, so it stays mounted and only the content
 * area shows the skeleton, avoiding a flash where the nav briefly
 * disappears and reappears on every tab switch.
 */
export default function GroupTabLoading() {
  return <GroupSkeleton />;
}
