import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TodayChecklist } from "./today-checklist";
import type { ChecklistItemView } from "@/types/domain";

const items: ChecklistItemView[] = [
  { id: "i1", label: "Wake early", position: 0, isSideQuest: false },
  { id: "i2", label: "Side quest", position: 1, isSideQuest: true },
];

describe("TodayChecklist", () => {
  it("renders items unchecked when nothing is done yet", () => {
    render(<TodayChecklist items={items} checkedIds={new Set()} onToggle={vi.fn()} />);
    expect(screen.getByText("Wake early")).toBeInTheDocument();
    expect(screen.getByText("SIDE QUEST")).toBeInTheDocument();
  });

  it("renders a checked item as done", () => {
    render(<TodayChecklist items={items} checkedIds={new Set(["i1"])} onToggle={vi.fn()} />);
    expect(screen.getByText("Wake early").className).toContain("line-through");
  });

  it("calls onToggle with the tapped item's id", () => {
    const onToggle = vi.fn();
    render(<TodayChecklist items={items} checkedIds={new Set()} onToggle={onToggle} />);
    fireEvent.click(screen.getByText("Wake early"));
    expect(onToggle).toHaveBeenCalledWith("i1");
  });

  it("disables every item and stops calling onToggle when disabled", () => {
    const onToggle = vi.fn();
    render(<TodayChecklist items={items} checkedIds={new Set()} onToggle={onToggle} disabled />);
    const button = screen.getByText("Wake early").closest("button")!;
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
