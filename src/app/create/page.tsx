import { Screen } from "@/components/layout/screen";
import { BackButton } from "@/components/ui/back-button";
import { CreateGroupForm } from "@/components/create/create-group-form";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata = { title: "New group" };

export default function CreateGroupPage() {
  return (
    <Screen className="pt-2 pb-10">
      <div className="flex items-center gap-3 py-1.5 pb-4.5">
        <BackButton href="/" />
        <span className="font-heading text-[21px]">New group</span>
      </div>
      <CreateGroupForm />
    </Screen>
  );
}
