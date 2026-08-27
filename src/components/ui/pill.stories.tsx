import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Pill } from "./pill";

const meta = {
  title: "UI/Pill",
  component: Pill,
  parameters: { layout: "centered" },
  args: {
    children: "Week",
    active: false,
  },
} satisfies Meta<typeof Pill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Inactive: Story = {};

export const Active: Story = {
  args: { active: true },
};

/** A segmented control built from a row of Pills, as it's actually used. */
export const Segmented: Story = {
  render: () => (
    <div className="flex gap-2">
      <Pill active>Week</Pill>
      <Pill>Month</Pill>
      <Pill>All time</Pill>
    </div>
  ),
};
