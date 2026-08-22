import { describe, expect, it } from "vitest";
import {
  emailSchema,
  otpCodeSchema,
  createGroupSchema,
  joinGroupSchema,
  avatarColorSchema,
  updateProfileSchema,
  updatePrefsSchema,
  checklistItemLabelSchema,
  reorderSchema,
} from "./schemas";

describe("emailSchema", () => {
  it("accepts a well-formed address", () => {
    expect(emailSchema.safeParse("a@b.com").success).toBe(true);
  });

  it("rejects a string with no @", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("otpCodeSchema", () => {
  it("accepts exactly six digits", () => {
    expect(otpCodeSchema.safeParse("123456").success).toBe(true);
  });

  it.each(["12345", "1234567", "12345a", ""])("rejects %j", (value) => {
    expect(otpCodeSchema.safeParse(value).success).toBe(false);
  });
});

describe("createGroupSchema", () => {
  const valid = {
    name: "Sunrise Run Crew",
    durationDays: 21,
    startDate: "2026-01-01",
    items: ["Wake early"],
  };

  it("accepts a valid payload", () => {
    expect(createGroupSchema.safeParse(valid).success).toBe(true);
  });

  it("trims and requires a non-empty name", () => {
    const result = createGroupSchema.safeParse({ ...valid, name: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects a duration that isn't 21 or 31", () => {
    const result = createGroupSchema.safeParse({ ...valid, durationDays: 30 });
    expect(result.success).toBe(false);
  });

  it("rejects an empty checklist", () => {
    const result = createGroupSchema.safeParse({ ...valid, items: [] });
    expect(result.success).toBe(false);
  });

  it("rejects more than 20 checklist items", () => {
    const result = createGroupSchema.safeParse({
      ...valid,
      items: Array.from({ length: 21 }, (_, i) => `Item ${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed start date", () => {
    const result = createGroupSchema.safeParse({ ...valid, startDate: "not-a-date" });
    expect(result.success).toBe(false);
  });
});

describe("joinGroupSchema", () => {
  it("uppercases the invite code", () => {
    const result = joinGroupSchema.safeParse({ inviteCode: "ab12cd" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.inviteCode).toBe("AB12CD");
  });

  it("rejects an empty code", () => {
    expect(joinGroupSchema.safeParse({ inviteCode: "   " }).success).toBe(false);
  });
});

describe("avatarColorSchema", () => {
  it("accepts a known swatch", () => {
    expect(avatarColorSchema.safeParse("#55743f").success).toBe(true);
  });

  it("rejects an arbitrary hex value not in the palette", () => {
    expect(avatarColorSchema.safeParse("#ffffff").success).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  it("accepts a valid name and color", () => {
    const result = updateProfileSchema.safeParse({ name: "Ada", color: "#55743f" });
    expect(result.success).toBe(true);
  });

  it("rejects a blank name", () => {
    const result = updateProfileSchema.safeParse({ name: "  ", color: "#55743f" });
    expect(result.success).toBe(false);
  });

  it("rejects a name over 40 characters", () => {
    const result = updateProfileSchema.safeParse({
      name: "a".repeat(41),
      color: "#55743f",
    });
    expect(result.success).toBe(false);
  });
});

describe("updatePrefsSchema", () => {
  it("requires all four booleans", () => {
    const result = updatePrefsSchema.safeParse({
      reminderEnabled: true,
      weeklyRecapEnabled: false,
      showStreaks: true,
      hideFromRanks: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing field", () => {
    const result = updatePrefsSchema.safeParse({
      reminderEnabled: true,
      weeklyRecapEnabled: false,
      showStreaks: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("checklistItemLabelSchema", () => {
  it("rejects a label over 60 characters", () => {
    expect(checklistItemLabelSchema.safeParse("a".repeat(61)).success).toBe(false);
  });

  it("accepts a normal label", () => {
    expect(checklistItemLabelSchema.safeParse("Read 20 pages").success).toBe(true);
  });
});

describe("reorderSchema", () => {
  it("accepts a group id with at least one ordered item", () => {
    const result = reorderSchema.safeParse({ groupId: "g1", orderedItemIds: ["a", "b"] });
    expect(result.success).toBe(true);
  });

  it("rejects an empty ordered list", () => {
    const result = reorderSchema.safeParse({ groupId: "g1", orderedItemIds: [] });
    expect(result.success).toBe(false);
  });
});
