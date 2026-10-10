import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Trip update",
  description: "A traveller's revised plans, shared from ConnectionKeeper.",
  robots: { index: false, follow: false },
};

export default function SharedLayout({ children }: { children: ReactNode }) {
  return children;
}
