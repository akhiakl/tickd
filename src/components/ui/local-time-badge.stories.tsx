import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LocalTimeBadge } from "./local-time-badge";

const meta = {
  title: "UI/LocalTimeBadge",
  component: LocalTimeBadge,
  parameters: { layout: "centered" },
  args: {
    timezone: "America/Los_Angeles",
  },
} satisfies Meta<typeof LocalTimeBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** No elected timezone yet - renders nothing, not a fallback clock. */
export const NoTimezone: Story = {
  args: { timezone: null },
};
