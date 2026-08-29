"use client";

import { useState, useTransition } from "react";
import { TriangleAlert } from "lucide-react";
import { archiveGroup, deleteGroup } from "@/server/actions/groups";
import { useToast } from "@/lib/use-toast";
import { Toast } from "@/components/ui/toast";

export function DangerZone({ groupId, dayIndex }: { groupId: string; dayIndex: number }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const { message, showToast } = useToast();

  function archive() {
    startTransition(async () => {
      const result = await archiveGroup(groupId);
      if (result.ok) showToast("Group archived");
    });
  }

  function confirmDelete() {
    startTransition(async () => {
      await deleteGroup(groupId);
    });
  }

  return (
    // Red-tinted danger-zone card, not the plain outline it used to be -
    // "Delete group" used to share --color-accent-d with every other
    // button in the app, so a genuinely destructive action didn't read as
    // one. See design/project/desktop-redesign/GroupSettingsDesktop.dc.html
    // and that folder's NOTES.md.
    <div className="border-danger bg-danger-bg mx-4 rounded-[26px] border-[1.5px] px-4.5 py-4 lg:mx-0">
      <div className="mb-1.5 flex items-center gap-2">
        <TriangleAlert size={17} strokeWidth={2.2} className="text-danger-d flex-none" />
        <div className="font-heading text-danger-d text-[16px]">End of the road</div>
      </div>
      <p className="text-danger-d mb-3 text-[12.5px] leading-normal">
        Archiving keeps the wall visible but locks new ticks. Deleting removes the group for
        everyone - this can&apos;t be undone.
      </p>

      {confirmingDelete ? (
        <div>
          <p className="text-danger-d mb-2.5 text-[12.5px] font-semibold">
            Delete for good? That&apos;s {dayIndex} days of history for everyone, gone.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="border-danger-d/40 text-text flex-1 cursor-pointer rounded-full border-[1.5px] py-2.5 text-[13.5px] font-bold"
            >
              Never mind
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={confirmDelete}
              className="bg-danger text-on-panel flex-1 cursor-pointer rounded-full py-2.5 text-[13.5px] font-bold hover:opacity-90"
            >
              Yes, delete it
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={archive}
            disabled={pending}
            className="border-danger-d/40 text-text hover:bg-text/[0.06] flex-1 cursor-pointer rounded-full border-[1.5px] py-2.5 text-[13.5px] font-bold"
          >
            Archive
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="bg-danger text-on-panel flex-1 cursor-pointer rounded-full py-2.5 text-[13.5px] font-bold hover:opacity-90"
          >
            Delete group
          </button>
        </div>
      )}

      <Toast message={message} />
    </div>
  );
}
