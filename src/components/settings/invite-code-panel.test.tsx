import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { InviteCodePanel } from "./invite-code-panel";

const { regenerateInvite } = vi.hoisted(() => ({
  regenerateInvite: vi.fn(),
}));

vi.mock("@/server/actions/groups", () => ({ regenerateInvite }));

describe("InviteCodePanel", () => {
  beforeEach(() => {
    regenerateInvite.mockReset();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("copies the invite link and confirms it with a toast", async () => {
    render(<InviteCodePanel groupId="g1" initialCode="ABC123" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    // NEXT_PUBLIC_APP_URL isn't set under Vitest, so this exercises the
    // same "localhost:3000" fallback src/app/layout.tsx's metadataBase
    // uses - see invite-code-panel.tsx's own comment.
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("localhost:3000/join?code=ABC123");
    expect(await screen.findByText("Invite link copied")).toBeInTheDocument();
  });

  it("shows a fallback toast when the clipboard write fails", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    render(<InviteCodePanel groupId="g1" initialCode="ABC123" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(
      await screen.findByText("Couldn't copy - try selecting the code instead"),
    ).toBeInTheDocument();
  });

  it("swaps in a new code after regenerating", async () => {
    regenerateInvite.mockResolvedValue({ ok: true, code: "XYZ789" });
    render(<InviteCodePanel groupId="g1" initialCode="ABC123" />);
    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    expect(await screen.findByText("XYZ789")).toBeInTheDocument();
    expect(screen.queryByText("ABC123")).not.toBeInTheDocument();
    expect(screen.getByText("New code: XYZ789")).toBeInTheDocument();
  });

  it("keeps the old code when regeneration fails", async () => {
    regenerateInvite.mockResolvedValue({ ok: false });
    render(<InviteCodePanel groupId="g1" initialCode="ABC123" />);
    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    await Promise.resolve();
    expect(screen.getByText("ABC123")).toBeInTheDocument();
  });
});
