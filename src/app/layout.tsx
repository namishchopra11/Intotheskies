import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import { Suspense } from "react";
import { DemoNextButton } from "@/components/trip/DemoNextButton";
import { FlightWatcher } from "@/components/trip/FlightWatcher";
import { AppOpening } from "@/components/ui/AppOpening";
import { AccountTour } from "@/components/ui/AccountTour";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { NavHistory } from "@/components/ui/BackButton";
import { THEME_COLORS, themeScript } from "@/components/ui/theme";
import "./globals.css";

// Barlow, drawn from California highway signs: words in Barlow, times, codes and big headings
// in Barlow Condensed (the font-display utility). Arrows are drawn as icons, never typed.
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-cond",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Layover",
    template: "%s · Layover",
  },
  description: "Your trip, next steps and contacts in one place when a flight changes.",
  applicationName: "Layover",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Layover", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${barlow.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-bg text-ink">
        <AppOpening />
        <PullToRefresh>
        {/* One phone-width column everywhere, centred on larger screens. */}
        <div className="app-column mx-auto flex min-h-dvh w-full max-w-[520px] flex-col pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
        </PullToRefresh>
        {/* Reads the URL, so it streams in after the static shell. Outside PullToRefresh: its
            pull moves the page with a transform, which would carry these fixed overlays with it. */}
        <Suspense fallback={null}>
          <NavHistory />
          <FlightWatcher />
          <DemoNextButton />
          <AccountTour />
        </Suspense>
      </body>
    </html>
  );
}
