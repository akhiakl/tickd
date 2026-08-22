import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToast } from "./use-toast";

describe("useToast", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts with no message", () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.message).toBeNull();
  });

  it("shows a message immediately", () => {
    const { result } = renderHook(() => useToast());
    act(() => result.current.showToast("Ticked - 1/8"));
    expect(result.current.message).toBe("Ticked - 1/8");
  });

  it("auto-dismisses after the configured duration", () => {
    const { result } = renderHook(() => useToast(1000));
    act(() => result.current.showToast("Saved"));
    act(() => vi.advanceTimersByTime(999));
    expect(result.current.message).toBe("Saved");
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.message).toBeNull();
  });

  it("restarts the dismiss timer when a new message arrives", () => {
    const { result } = renderHook(() => useToast(1000));
    act(() => result.current.showToast("First"));
    act(() => vi.advanceTimersByTime(700));
    act(() => result.current.showToast("Second"));
    act(() => vi.advanceTimersByTime(700));
    // 1400ms since "First" fired, but only 700ms since "Second" - still up.
    expect(result.current.message).toBe("Second");
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.message).toBeNull();
  });
});
