import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { caprasimo, figtree } from "@/lib/fonts";
import { ThemeProvider } from "@/components/theme-provider";
import { HydrationMarker } from "@/components/hydration-marker";
import "./globals.css";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: "Tickd",
    template: "%s / Tickd",
  },
  description:
    "A shared daily checklist for your group. Tick your list, watch the wall fill in, don't be the one with the gap.",
  applicationName: "Tickd",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3e9" },
    { media: "(prefers-color-scheme: dark)", color: "#14160f" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${caprasimo.variable} ${figtree.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full antialiased">
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
        <HydrationMarker />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
