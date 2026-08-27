import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Toast } from "./toast";

const meta = {
  title: "UI/Toast",
  component: Toast,
  parameters: { layout: "fullscreen" },
  args: {
    message: "Saved",
  },
  decorators: [
    (Story) => (
      <div className="relative h-40 w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Visible: Story = {};

export const Hidden: Story = {
  args: { message: null },
};
