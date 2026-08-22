import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockFindFirst, mockReturning } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockReturning: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/constants", () => ({ AVATAR_SWATCHES: ["#55743f"] }));
vi.mock("@/server/db", () => ({
  db: {
    query: { users: { findFirst: mockFindFirst } },
    insert: () => ({ values: () => ({ returning: mockReturning }) }),
    update: () => ({ set: () => ({ where: () => ({ returning: mockReturning }) }) }),
  },
}));

import { upsertUserFromIdentity } from "./users";

const IDENTITY = { authSub: "auth0|123", email: "alice@example.com", name: "Alice" };
const EXISTING = {
  id: "u1",
  authSub: "auth0|123",
  email: "alice@example.com",
  name: "Alice",
  color: "#55743f",
};

describe("upsertUserFromIdentity", () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
    mockReturning.mockReset();
  });

  it("returns the existing row immediately when found by authSub", async () => {
    mockFindFirst.mockResolvedValueOnce(EXISTING);
    const result = await upsertUserFromIdentity(IDENTITY);
    expect(result).toBe(EXISTING);
    expect(mockReturning).not.toHaveBeenCalled();
  });

  it("inserts and returns a new user when no row exists", async () => {
    const newUser = { ...IDENTITY, id: "u2", color: "#55743f" };
    mockFindFirst.mockResolvedValueOnce(undefined);
    mockReturning.mockResolvedValueOnce([newUser]);
    const result = await upsertUserFromIdentity(IDENTITY);
    expect(result).toEqual(newUser);
  });

  it("links to an existing row on email unique-constraint violation (same email, different provider)", async () => {
    const byEmailRow = {
      id: "u3",
      authSub: "email|456",
      email: "alice@example.com",
      name: "Alice",
      color: "#55743f",
    };
    const linkedRow = { ...byEmailRow, authSub: IDENTITY.authSub };

    mockFindFirst.mockResolvedValueOnce(undefined); // first lookup: by authSub → miss
    mockReturning.mockRejectedValueOnce(new Error("unique constraint violation")); // insert fails
    mockFindFirst.mockResolvedValueOnce(byEmailRow); // second lookup: by email → hit
    mockReturning.mockResolvedValueOnce([linkedRow]); // update succeeds

    const result = await upsertUserFromIdentity(IDENTITY);
    expect(result).toEqual(linkedRow);
  });

  it("re-throws when insert fails and there is no matching email row", async () => {
    const err = new Error("unique constraint violation");
    mockFindFirst.mockResolvedValueOnce(undefined); // authSub miss
    mockReturning.mockRejectedValueOnce(err); // insert fails
    mockFindFirst.mockResolvedValueOnce(undefined); // email miss too

    await expect(upsertUserFromIdentity(IDENTITY)).rejects.toThrow(err);
  });
});
