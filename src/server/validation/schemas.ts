import { z } from "zod";
import { AVATAR_SWATCHES } from "@/lib/constants";

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
