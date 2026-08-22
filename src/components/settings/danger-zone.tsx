"use client";

import { useState, useTransition } from "react";
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
    <div className="border-accent/35 mx-4 rounded-[26px] border-[1.5px] px-4.5 py-4">
      <div className="font-heading mb-1 text-[16px]">End of the road</div>
      <p className="text-muted mb-3 text-[12.5px]">
        Archiving keeps the wall visible but locks new ticks.
      </p>

      {confirmingDelete ? (
        <div>
          <p className="text-flame mb-2.5 text-[12.5px] font-semibold">
            Delete for good? That&apos;s {dayIndex} days of history for everyone, gone.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="border-text/20 flex-1 cursor-pointer rounded-full border-[1.5px] py-2.5 text-[13.5px] font-bold"
            >
              Never mind
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={confirmDelete}
              className="bg-accent-d text-on-panel hover:bg-accent-xd flex-1 cursor-pointer rounded-full py-2.5 text-[13.5px] font-bold"
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
            className="border-text/20 text-text hover:bg-text/[0.06] flex-1 cursor-pointer rounded-full border-[1.5px] py-2.5 text-[13.5px] font-bold"
          >
            Archive
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="bg-accent-d text-on-panel hover:bg-accent-xd flex-1 cursor-pointer rounded-full py-2.5 text-[13.5px] font-bold"
          >
            Delete group
          </button>
        </div>
      )}

      <Toast message={message} />
    </div>
  );
}
