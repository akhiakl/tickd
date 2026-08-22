import { signOut } from "@/auth";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button
        type="submit"
        className="border-text/20 font-heading text-text hover:bg-text/[0.06] w-full cursor-pointer rounded-full border-[1.5px] bg-transparent py-3.5 text-[15px] transition-colors"
      >
        Sign out
      </button>
    </form>
  );
}
