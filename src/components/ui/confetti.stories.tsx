import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Confetti } from "./confetti";
import { Button } from "./button";

const meta = {
  title: "UI/Confetti",
  component: Confetti,
  parameters: { layout: "fullscreen" },
  args: {
    trigger: 0,
  },
  decorators: [
    (Story) => (
      <div className="relative h-64 w-full overflow-hidden">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Confetti>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Fires once on mount since `trigger` starts truthy at 1. */
export const Burst: Story = {
  args: { trigger: 1 },
};

/** Interactive: each click bumps `trigger` to a new value, firing a fresh burst. */
export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [trigger, setTrigger] = useState(0);
      return (
        <div className="relative flex h-64 w-full flex-col items-center justify-center gap-4 overflow-hidden">
          <Confetti trigger={trigger} />
          <Button className="w-auto" onClick={() => setTrigger((t) => t + 1)}>
            Celebrate
          </Button>
        </div>
      );
    }
    return <Demo />;
  },
};
