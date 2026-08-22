import { signIn } from "@/auth";

type Provider = { name: string; initial: string; dotColor: string; connection?: string };

const PROVIDERS: Provider[] = [
  { name: "Google", initial: "G", dotColor: "#c67139", connection: "google-oauth2" },
  { name: "Apple", initial: "", dotColor: "#1d2019" },
  { name: "WhatsApp", initial: "W", dotColor: "#5a6c43" },
];

/**
 * Google goes through Auth0's real OAuth handshake - there's no way around
 * a redirect for a genuine social login. Apple and WhatsApp are shown for
 * parity with the design but disabled: this tenant has no Apple developer
 * account or WhatsApp Business connection configured yet.
 */
export function ProviderButtons({ callbackUrl }: { callbackUrl: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      {PROVIDERS.map((provider) => {
        const enabled = Boolean(provider.connection);
        const button = (
          <button
            type="submit"
            disabled={!enabled}
            className="border-text/[0.12] bg-surface hover:bg-surface-2 flex w-full items-center gap-3 rounded-full border-[1.5px] px-4.5 py-3.5 text-[15px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span
              className="font-heading text-on-panel flex h-6.5 w-6.5 flex-none items-center justify-center rounded-full text-[12px]"
              style={{ background: provider.dotColor }}
            >
              {provider.initial}
            </span>
            <span>
              {enabled ? "Continue with" : "Coming soon:"} {provider.name}
            </span>
          </button>
        );

        if (!enabled) return <div key={provider.name}>{button}</div>;

        const connection: string = provider.connection ?? "";
        return (
          <form
            key={provider.name}
            action={async () => {
              "use server";
              await signIn("auth0", { redirectTo: callbackUrl }, { connection });
            }}
          >
            {button}
          </form>
        );
      })}
    </div>
  );
}
