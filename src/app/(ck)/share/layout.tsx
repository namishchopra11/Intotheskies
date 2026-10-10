import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { ShareSkeleton } from "./ShareSkeleton";

export const metadata: Metadata = { title: "Share an update" };

// The screen reads the disruption id from the URL, which is only known at request time.
export default function ShareLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<ShareSkeleton />}>{children}</Suspense>;
}
