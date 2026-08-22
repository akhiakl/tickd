import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MembersSettingsList } from "./members-settings-list";

const { removeMember } = vi.hoisted(() => ({ removeMember: vi.fn().mockResolvedValue({}) }));
vi.mock("@/server/actions/groups", () => ({ removeMember }));

const members = [
  { userId: "u1", name: "Ada", color: "#55743f", isMe: true },
  { userId: "u2", name: "Marcus", color: "#7a8a5e", isMe: false },
];

describe("MembersSettingsList", () => {
  it("does not offer a remove button for the current user", () => {
    render(<MembersSettingsList groupId="g1" members={members} />);
    const meRow = screen.getByText("Ada (you)").closest("div")!;
    expect(meRow.querySelector("button")).toBeNull();
  });

  it("removes another member optimistically", async () => {
    render(<MembersSettingsList groupId="g1" members={members} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.queryByText("Marcus")).not.toBeInTheDocument();
    expect(removeMember).toHaveBeenCalledWith("g1", "u2");
  });
});
