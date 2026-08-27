import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { useLocalTime } from "./use-local-time";

describe("useLocalTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when timezone is null", () => {
    const { result } = renderHook(() => useLocalTime(null));
    expect(result.current).toBeNull();
  });

  it("formats the current time in the given zone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T20:15:00Z"));
    const { result } = renderHook(() => useLocalTime("UTC"));
    expect(result.current).toBe("8:15 PM");
  });

  it("re-formats after the 30s tick", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T20:15:00Z"));
    const { result } = renderHook(() => useLocalTime("UTC"));
    expect(result.current).toBe("8:15 PM");

    act(() => {
      vi.setSystemTime(new Date("2026-01-15T20:16:00Z"));
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current).toBe("8:16 PM");
  });

  it("returns null for an unrecognized zone instead of throwing", () => {
    const { result } = renderHook(() => useLocalTime("Not/AZone"));
    expect(result.current).toBeNull();
  });
});
