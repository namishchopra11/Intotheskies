import type { Metadata, Viewport } from "next";
import { Fraunces, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { Shell } from "@/components/jetflex/Shell";
import "./jetflex.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz"] });
const hanken = Hanken_Grotesk({ variable: "--font-hanken", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "JetFlex", template: "%s · JetFlex" },
  description: "AI-powered private aviation intelligence: compare charter, empty legs, first class and hybrid journeys.",
  applicationName: "JetFlex",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0B1320" };

export default function JetflexLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${hanken.variable} ${mono.variable} h-full`}>
      <body className="min-h-dvh bg-midnight text-warm">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
