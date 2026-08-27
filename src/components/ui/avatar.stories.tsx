import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Avatar } from "./avatar";
import { AVATAR_SWATCHES } from "@/lib/constants";

const meta = {
  title: "UI/Avatar",
  component: Avatar,
  parameters: { layout: "centered" },
  args: {
    name: "Priya",
    color: AVATAR_SWATCHES[0],
    seed: "priya-seed",
    size: 48,
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
  args: { size: 28 },
};

/** A member row's worth of avatars - each seed produces a different, stable pattern. */
export const Group: Story = {
  render: () => (
    <div className="flex gap-2">
      {["Priya", "Sam", "Marcus", "Yuki"].map((name, i) => (
        <Avatar
          key={name}
          name={name}
          color={AVATAR_SWATCHES[i % AVATAR_SWATCHES.length]}
          seed={`${name}-seed`}
        />
      ))}
    </div>
  ),
};
