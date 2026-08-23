"use client";

import { useOptimistic, useTransition } from "react";
import { removeMember } from "@/server/actions/groups";
import { Avatar } from "@/components/ui/avatar";

type Member = { userId: string; name: string; color: string; avatarSeed: string; isMe: boolean };

export function MembersSettingsList({ groupId, members }: { groupId: string; members: Member[] }) {
  const [, startTransition] = useTransition();
  const [optimisticMembers, setOptimisticMembers] = useOptimistic(members);

  function remove(userId: string) {
    startTransition(async () => {
      setOptimisticMembers(optimisticMembers.filter((m) => m.userId !== userId));
      await removeMember(groupId, userId);
    });
  }

  return (
    <div className="flex flex-col gap-0.5">
      {optimisticMembers.map((member) => (
        <div key={member.userId} className="flex items-center gap-3 rounded-[18px] px-2.5 py-2">
          <Avatar name={member.name} color={member.color} seed={member.avatarSeed} size={30} />
          <span className="flex-1 text-[14.5px] font-semibold">
            {member.name}
            {member.isMe && " (you)"}
          </span>
          {!member.isMe && (
            <button
              type="button"
              onClick={() => remove(member.userId)}
              className="text-accent-d hover:bg-accent/[0.14] cursor-pointer rounded-full px-2.5 py-1.5 text-[12.5px] font-bold"
            >
              Remove
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
