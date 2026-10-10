import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { THEME_COLORS, themeScript } from "@/components/ui/theme";
import "./globals.css";

// Light theme (Wayfinding)
const plexSans = IBM_Plex_Sans({ variable: "--font-plex-sans", subsets: ["latin"] });
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
  preload: false,
});

// Dark theme (Night terminal)
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: {
    default: "ConnectionKeeper",
    template: "%s · ConnectionKeeper",
  },
  description: "Your trip, next steps and contacts in one place when a flight changes.",
  applicationName: "ConnectionKeeper",
  appleWebApp: { capable: true, title: "ConnectionKeeper", statusBarStyle: "default" },
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
      className={`${plexSans.variable} ${plexMono.variable} ${atkinson.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh bg-bg text-ink">
        {/* One phone-width column everywhere, centred on larger screens. */}
        <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </body>
    </html>
  );
}
