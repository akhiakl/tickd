import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Logo } from "./logo";

const meta = {
  title: "UI/Logo",
  component: Logo,
  parameters: { layout: "centered" },
  args: {
    size: 48,
  },
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
  args: { size: 24 },
};
