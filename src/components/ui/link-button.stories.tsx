import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LinkButton } from "./link-button";

const meta = {
  title: "UI/LinkButton",
  component: LinkButton,
  parameters: { layout: "centered" },
  args: {
    href: "#",
    children: "Get started",
    variant: "primary",
  },
} satisfies Meta<typeof LinkButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Outline: Story = {
  args: { variant: "outline" },
};
