import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProgressRing } from "./progress-ring";

const meta = {
  title: "UI/ProgressRing",
  component: ProgressRing,
  parameters: { layout: "centered" },
  args: {
    done: 3,
    total: 5,
  },
} satisfies Meta<typeof ProgressRing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InProgress: Story = {};

export const Complete: Story = {
  args: { done: 5, total: 5 },
};

export const Zero: Story = {
  args: { done: 0, total: 5 },
};
