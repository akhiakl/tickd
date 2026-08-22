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

const members = [
  {
    userId: "u1",
    name: "Ada",
    isMe: true,
    countsByDate: { "2026-01-01": 1 },
    itemsByDate: { "2026-01-01": ["i1"] },
  },
  {
    userId: "u2",
    name: "Marcus",
    isMe: false,
    countsByDate: { "2026-01-01": 2 },
    itemsByDate: { "2026-01-01": ["i1", "i2"] },
  },
];

describe("WallGrid", () => {
  it("ranks members by total ticks, highest first", () => {
    render(<WallGrid members={members} dates={["2026-01-01"]} today="2026-01-01" items={items} />);
    const names = screen.getAllByText(/^(You|Marcus)$/).map((el) => el.textContent);
    expect(names).toEqual(["Marcus", "You"]);
  });

  it("opens a day's detail panel on click and closes it via the close button", () => {
    render(<WallGrid members={members} dates={["2026-01-01"]} today="2026-01-01" items={items} />);
    fireEvent.click(screen.getByLabelText(/^Marcus, day 1,/));
    expect(screen.getByText("2 of 2 done")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Close"));
    expect(screen.queryByText("2 of 2 done")).not.toBeInTheDocument();
  });

  it("disables future-day cells so they can't be selected", () => {
    render(
      <WallGrid
        members={members}
        dates={["2026-01-01", "2026-01-02"]}
        today="2026-01-01"
        items={items}
      />,
    );
    const futureCell = screen.getByLabelText("you, day 2");
    expect(futureCell).toBeDisabled();
  });
});
