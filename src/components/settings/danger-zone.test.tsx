import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DangerZone } from "./danger-zone";

const { archiveGroup, deleteGroup } = vi.hoisted(() => ({
  archiveGroup: vi.fn().mockResolvedValue({ ok: true }),
  deleteGroup: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/server/actions/groups", () => ({ archiveGroup, deleteGroup }));

describe("DangerZone", () => {
  it("archives without requiring confirmation and shows a toast", async () => {
    render(<DangerZone groupId="g1" dayIndex={12} />);
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(await screen.findByText("Group archived")).toBeInTheDocument();
    expect(archiveGroup).toHaveBeenCalledWith("g1");
  });

  it("requires an explicit confirmation before deleting", () => {
    render(<DangerZone groupId="g1" dayIndex={12} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete group" }));
    expect(screen.getByText(/Delete for good\?/)).toBeInTheDocument();
    expect(deleteGroup).not.toHaveBeenCalled();
  });

  it("backing out of the confirmation cancels the delete", () => {
    render(<DangerZone groupId="g1" dayIndex={12} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete group" }));
    fireEvent.click(screen.getByRole("button", { name: "Never mind" }));
    expect(screen.queryByText(/Delete for good\?/)).not.toBeInTheDocument();
    expect(deleteGroup).not.toHaveBeenCalled();
  });

  it("confirming deletes the group", async () => {
    render(<DangerZone groupId="g1" dayIndex={12} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete group" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, delete it" }));
    expect(deleteGroup).toHaveBeenCalledWith("g1");
  });
});
