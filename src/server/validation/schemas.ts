import { z } from "zod";
import { AVATAR_SWATCHES } from "@/lib/constants";

export const guestNameSchema = z.string().trim().min(1, "Enter a name.").max(40);

/** Lowercased so uniqueness and lookups are case-insensitive (see the
 * `username` column comment in src/server/db/schema/users.ts). */
export const usernameSchema = z
  .string()
  .trim()
  .min(3, "At least 3 characters.")
  .max(24, "24 characters or fewer.")
  .regex(/^[a-z0-9_]+$/i, "Letters, numbers, and underscores only.")
  .transform((v) => v.toLowerCase());

// Deliberately low-friction, not a real security boundary - see the
// account-recovery discussion this was designed around: no password reset
// flow, no complexity rules, just "long enough to not be a one-character typo."
export const passwordSchema = z.string().min(6, "At least 6 characters.").max(72);

export const setCredentialsSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const credentialsSignInSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Enter your username.")
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1, "Enter your password."),
});

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, "Give the group a name.").max(60),
  durationDays: z.union([z.literal(21), z.literal(31)]),
  startDate: z.iso.date(),
  items: z
    .array(z.string().trim().min(1).max(60))
    .min(1, "Add at least one checklist item.")
    .max(20, "That's a lot of items - keep it to 20 or fewer."),
});

export const joinGroupSchema = z.object({
  inviteCode: z
    .string()
    .trim()
    .min(1, "Enter an invite code.")
    .transform((v) => v.toUpperCase()),
});

export const avatarColorSchema = z.enum(AVATAR_SWATCHES as [string, ...string[]]);

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Your name can't be empty.").max(40),
  color: avatarColorSchema,
});

export const updatePrefsSchema = z.object({
  reminderEnabled: z.boolean(),
  weeklyRecapEnabled: z.boolean(),
  showStreaks: z.boolean(),
  hideFromRanks: z.boolean(),
});

export const checklistItemLabelSchema = z.string().trim().min(1).max(60);

export const reorderSchema = z.object({
  groupId: z.string(),
  orderedItemIds: z.array(z.string()).min(1),
});
