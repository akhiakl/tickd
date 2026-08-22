import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChecklistDraftEditor } from "./checklist-draft-editor";

describe("ChecklistDraftEditor", () => {
  it("renders one row per initial label", () => {
    render(<ChecklistDraftEditor initialLabels={["Wake early", "Read"]} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue("Wake early")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Read")).toBeInTheDocument();
  });

  it("reports the renamed label to onChange", () => {
    const onChange = vi.fn();
    render(<ChecklistDraftEditor initialLabels={["Wake early"]} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue("Wake early"), {
      target: { value: "Wake before 6" },
    });
    expect(onChange).toHaveBeenLastCalledWith(["Wake before 6"]);
    expect(screen.getByDisplayValue("Wake before 6")).toBeInTheDocument();
  });

  it("removes a row and reports the shortened list", () => {
    const onChange = vi.fn();
    render(<ChecklistDraftEditor initialLabels={["Wake early", "Read"]} onChange={onChange} />);
    const readRow = screen.getByDisplayValue("Read").closest("div")!;
    fireEvent.click(readRow.querySelector('button[aria-label="Remove item"]')!);
    expect(onChange).toHaveBeenLastCalledWith(["Wake early"]);
    expect(screen.queryByDisplayValue("Read")).not.toBeInTheDocument();
  });

  it("adds a new default row and reports the grown list", () => {
    const onChange = vi.fn();
    render(<ChecklistDraftEditor initialLabels={["Wake early"]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Add an item" }));
    expect(onChange).toHaveBeenLastCalledWith(["Wake early", "New item"]);
    expect(screen.getByDisplayValue("New item")).toBeInTheDocument();
  });
});
