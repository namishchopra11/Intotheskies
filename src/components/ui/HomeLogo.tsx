"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "./Brand";
import { NAV_BACK } from "./PageTransition";

/**
 * The Layover logo, top left on every screen. It always goes to the home screen; when you're
 * already there it scrolls back to the top. (Logged out, home sends you on to log in.)
 */
export function HomeLogo({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const atHome = pathname === "/";
  return (
    <Link
      href="/"
      transitionTypes={atHome ? undefined : NAV_BACK}
      aria-label="Layover home"
      data-tour="home"
      onClick={(e) => {
        if (!atHome) return;
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className="ck-press -ml-1 inline-flex min-h-11 shrink-0 items-center rounded-control px-1 text-ink"
    >
      {compact ? <Wordmark size={24} /> : <Wordmark size={28} />}
    </Link>
  );
}
