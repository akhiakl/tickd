import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";

const meta = {
  title: "UI/Button",
  component: Button,
  parameters: { layout: "centered" },
  argTypes: {
    variant: { control: "select", options: ["primary", "outline", "ghost"] },
    size: { control: "select", options: ["default", "sm"] },
  },
  args: {
    children: "Continue",
    variant: "primary",
    size: "default",
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Outline: Story = {
  args: { variant: "outline" },
};

export const Ghost: Story = {
  args: { variant: "ghost" },
};

export const Small: Story = {
  args: { size: "sm", children: "Skip" },
};

export const Disabled: Story = {
  args: { disabled: true },
};

/** Every variant/size pair side by side, at the panel width they're actually used at. */
export const AllVariants: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="primary" size="sm">
        Primary / sm
      </Button>
      <Button variant="primary" disabled>
        Disabled
      </Button>
    </div>
  ),
};
