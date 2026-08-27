import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BadgeRow } from "./badge-row";
import { ALL_BADGES } from "@/lib/achievements";

const meta = {
  title: "UI/BadgeRow",
  component: BadgeRow,
  parameters: { layout: "padded" },
  args: {
    earned: [],
  },
} satisfies Meta<typeof BadgeRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoneEarned: Story = {};

export const SomeEarned: Story = {
  args: { earned: ALL_BADGES.slice(0, 3) },
};

export const AllEarned: Story = {
  args: { earned: ALL_BADGES },
};
