import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Sheet } from "./sheet";
import { Button } from "./button";

const meta = {
  title: "UI/Sheet",
  component: Sheet,
  parameters: { layout: "fullscreen" },
  args: {
    open: true,
    title: "Leave group?",
    subtitle: "You can rejoin later with the invite link.",
    onClose: () => {},
    children: null,
  },
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  render: (args) => (
    <div className="relative h-[520px] w-full overflow-hidden">
      <Sheet {...args}>
        <div className="flex flex-col gap-3">
          <Button variant="outline">Cancel</Button>
          <Button variant="primary">Leave group</Button>
        </div>
      </Sheet>
    </div>
  ),
};

/** Interactive: the trigger opens the sheet, backdrop tap or the X closes it. */
export const Interactive: Story = {
  render: () => {
    function Demo() {
      const [open, setOpen] = useState(false);
      return (
        <div className="relative h-[520px] w-full overflow-hidden">
          <div className="p-6">
            <Button onClick={() => setOpen(true)}>Open sheet</Button>
          </div>
          <Sheet
            open={open}
            onClose={() => setOpen(false)}
            title="Leave group?"
            subtitle="You can rejoin later with the invite link."
          >
            <div className="flex flex-col gap-3">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setOpen(false)}>
                Leave group
              </Button>
            </div>
          </Sheet>
        </div>
      );
    }
    return <Demo />;
  },
};
