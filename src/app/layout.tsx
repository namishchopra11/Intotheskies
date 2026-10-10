import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { themeScript } from "@/components/ui/theme";
const publicSans = localFont({ src: "../../public/fonts/PublicSans.ttf", variable: "--font-public-sans", display: "swap", weight: "100 900" });
export const metadata: Metadata = {
 title: { default: "ConnectionKeeper", template: "%s · ConnectionKeeper" },
 description: "A calmer way to keep your trip, next steps and people together when a flight changes.",
 applicationName: "ConnectionKeeper", formatDetection: { telephone: false }, manifest: "/manifest.webmanifest",
 appleWebApp: { capable: true, title: "ConnectionKeeper", statusBarStyle: "default" },
 icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f6f5ef", colorScheme: "light" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
 return <html lang="en" className={publicSans.variable} suppressHydrationWarning><body><script dangerouslySetInnerHTML={{ __html: themeScript }} /><div className="mx-auto min-h-dvh w-full max-w-[440px]">{children}</div></body></html>;
}
