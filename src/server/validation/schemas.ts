import { z } from "zod";
import { AVATAR_SWATCHES } from "@/lib/constants";

export const guestNameSchema = z.string().trim().min(1, "Enter a name.").max(40);

// Same shape most sites converge on (GitHub, Instagram, etc): lowercase
// letters, digits, underscore, and period only - no uppercase, no other
// punctuation, and no leading/trailing/doubled `.`/`_`, which read as
// copy-paste or typo artifacts rather than an intentional name. Rejected
// outright rather than silently normalized (the old regex had an `/i`
// flag and lowercased after the fact) - a user who typed "Ada" should see
// why, not have it silently become "ada" out from under them.
export const usernameSchema = z
  .string()
  .trim()
  .min(3, "At least 3 characters.")
  .max(24, "24 characters or fewer.")
  .regex(/^[a-z0-9_.]+$/, "Lowercase letters, numbers, underscores, and periods only.")
  .regex(/^[^._]/, "Can't start with a period or underscore.")
  .regex(/[^._]$/, "Can't end with a period or underscore.")
  .regex(/^(?!.*[._]{2})/, "No repeated periods or underscores.");

// NIST SP 800-63B recommends length + a breach/common-password check over
// forced composition rules (require a symbol, a digit, etc.) - composition
// rules measurably push people toward predictable patterns ("Password1!")
// without meaningfully raising entropy, and are exactly the rule a
// password *manager* doesn't need. So: a real length floor (8, not the
// "6" this started at), no character-class requirements, and reject the
// handful of passwords that show up in nearly every credential-stuffing
// wordlist - not a full breach-corpus check, just blocking the obvious
// zero-effort guesses.
const COMMON_PASSWORDS = new Set([
  "password",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty123",
  "letmein11",
  "iloveyou1",
  "password1",
  "password123",
  "11111111",
  "00000000",
  "abc123456",
  "admin1234",
  "welcome123",
  "monkey123",
  "dragon123",
  "football1",
  "baseball1",
  "sunshine1",
  "princess1",
]);

export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters.")
  .max(72)
  .refine((v) => !COMMON_PASSWORDS.has(v.toLowerCase()), "That password is too easy to guess.");

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
  // Any whole number of days works, not just the old 21/31 presets - the
  // create form still offers those as quick-pick shortcuts, but this
  // accepts whatever a person actually typed. Upper-bounded at a year
  // mostly to keep the challenge day-index math (and the Wall's month
  // grid) within a sane range, not because a longer challenge is
  // conceptually wrong.
  durationDays: z.number().int().min(1, "Needs to run at least 1 day.").max(365, "365 days, max."),
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
