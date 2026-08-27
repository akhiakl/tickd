import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BackButton } from "./back-button";

const meta = {
  title: "UI/BackButton",
  component: BackButton,
  parameters: { layout: "centered" },
  args: {
    href: "/",
  },
} satisfies Meta<typeof BackButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
