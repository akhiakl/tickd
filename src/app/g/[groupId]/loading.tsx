import { GroupSkeleton } from "@/components/layout/group-skeleton";

/**
 * Shown the instant a navigation into a group starts, while
 * GroupLayout's membership check and first data fetch resolve - the
 * previous gap was a blank screen for however long that took, with no
 * indication anything was happening. Includes the header row since, at
 * this point, the tab shell (bottom nav) hasn't mounted yet either.
 */
export default function GroupLoading() {
  return <GroupSkeleton header />;
}
