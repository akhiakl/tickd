import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WallGrid, cellClass } from "./wall-grid";
import type { ChecklistItemView } from "@/types/domain";

describe("cellClass", () => {
  it("marks a future day as unfilled", () => {
    expect(cellClass(null, 5)).toBe("bg-future");
  });

  it("marks a zero-progress day distinctly from an unfilled one", () => {
    expect(cellClass(0, 5)).toBe("bg-zero");
  });

  it("marks a fully-completed day", () => {
    expect(cellClass(5, 5)).toBe("bg-ok");
  });

  it("marks a mostly-completed day (>= 60%)", () => {
    expect(cellClass(3, 5)).toBe("bg-ok-3");
  });

  it("marks a partially-completed day (< 60%)", () => {
    expect(cellClass(2, 5)).toBe("bg-ok-4");
  });
});

const items: ChecklistItemView[] = [
  { id: "i1", label: "Wake early", position: 0, isSideQuest: false },
  { id: "i2", label: "Read", position: 1, isSideQuest: false },
];

// 2026-01-01 is a Thursday. Challenge runs Jan 1 - Jan 10.
const members = [
  {
    userId: "u1",
    name: "Ada",
    color: "#55743f",
    avatarSeed: "seed1",
    isMe: true,
    localToday: "2026-01-05",
    localCountsByDate: { "2026-01-01": 1 },
    localItemsByDate: { "2026-01-01": ["i1"] },
  },
  {
    userId: "u2",
    name: "Marcus",
    color: "#8c491a",
    avatarSeed: "seed2",
    isMe: false,
    localToday: "2026-01-05",
    localCountsByDate: { "2026-01-01": 2 },
    localItemsByDate: { "2026-01-01": ["i1", "i2"] },
  },
];

describe("WallGrid", () => {
  it("shows the month containing the selected member's own today", () => {
    render(<WallGrid members={members} startDate="2026-01-01" durationDays={10} items={items} />);
    expect(screen.getByText("January 2026")).toBeInTheDocument();
  });

  it("opens a day's detail panel on click and closes it via the close button", () => {
    render(<WallGrid members={members} startDate="2026-01-01" durationDays={10} items={items} />);
    fireEvent.click(screen.getByLabelText("2026-01-01, 1 of 2 done"));
    expect(screen.getByText("1 of 2 done")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Close"));
    expect(screen.queryByText("1 of 2 done")).not.toBeInTheDocument();
  });

  it("disables days after the viewed member's own today", () => {
    render(<WallGrid members={members} startDate="2026-01-01" durationDays={10} items={items} />);
    expect(screen.getByLabelText("2026-01-10")).toBeDisabled();
  });

  it("disables days before the challenge started", () => {
    render(<WallGrid members={members} startDate="2026-01-05" durationDays={10} items={items} />);
    expect(screen.getByLabelText("2026-01-01")).toBeDisabled();
  });

  it("switches which member's data is shown", () => {
    render(<WallGrid members={members} startDate="2026-01-01" durationDays={10} items={items} />);
    fireEvent.click(screen.getByRole("button", { name: "Marcus" }));
    fireEvent.click(screen.getByLabelText("2026-01-01, 2 of 2 done"));
    expect(screen.getByText("Marcus - 2026-01-01")).toBeInTheDocument();
  });

  it("disables the previous-month button at the start of the challenge's range", () => {
    render(<WallGrid members={members} startDate="2026-01-01" durationDays={10} items={items} />);
    expect(screen.getByLabelText("Previous month")).toBeDisabled();
  });
});
