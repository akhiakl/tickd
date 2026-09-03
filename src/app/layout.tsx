import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { caprasimo, figtree } from "@/lib/fonts";
import { ThemeProvider } from "@/components/theme-provider";
import { HydrationMarker } from "@/components/hydration-marker";
import { TimezoneSync } from "@/components/timezone-sync";
import { getBaseUrl } from "@/lib/base-url";
import "./globals.css";

const description =
  "A shared daily checklist for your group. Tick your list, watch the wall fill in, don't be the one with the gap.";

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: "Tickd",
    template: "%s / Tickd",
  },
  description,
  applicationName: "Tickd",
  keywords: ["shared checklist", "group habit tracker", "daily challenge", "accountability app"],
  // Per-page metadata (e.g. the account/settings/join pages behind
  // requireValidUserId()) overrides this with `robots: { index: false }` -
  // this default only applies to routes that don't set their own.
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    siteName: "Tickd",
    title: "Tickd",
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tickd",
    description,
  },
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
        <TimezoneSync />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
