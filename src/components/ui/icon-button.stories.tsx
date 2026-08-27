import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { X } from "lucide-react";
import { IconButton } from "./icon-button";

const meta = {
  title: "UI/IconButton",
  component: IconButton,
  parameters: { layout: "centered" },
  args: {
    "aria-label": "Close",
    children: <X size={15} strokeWidth={2.75} />,
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Bordered: Story = {};

export const Borderless: Story = {
  args: { bordered: false },
};
