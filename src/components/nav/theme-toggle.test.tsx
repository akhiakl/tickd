import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./theme-toggle";

const { useTheme } = vi.hoisted(() => ({ useTheme: vi.fn() }));
vi.mock("next-themes", () => ({ useTheme }));

describe("ThemeToggle", () => {
  it("shows a moon and switches to dark when currently light", () => {
    const setTheme = vi.fn();
    useTheme.mockReturnValue({ resolvedTheme: "light", setTheme });
    render(<ThemeToggle />);
    fireEvent.click(screen.getByLabelText("Toggle theme"));
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("switches to light when currently dark", () => {
    const setTheme = vi.fn();
    useTheme.mockReturnValue({ resolvedTheme: "dark", setTheme });
    render(<ThemeToggle />);
    fireEvent.click(screen.getByLabelText("Toggle theme"));
    expect(setTheme).toHaveBeenCalledWith("light");
  });
});
