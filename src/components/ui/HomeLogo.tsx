"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "./Brand";
import { NAV_BACK } from "./PageTransition";

/**
 * The Layover logo, top left on every screen. It always goes to the home screen; when you're
 * already there it scrolls back to the top. (Logged out, home sends you on to log in.)
 */
export function HomeLogo() {
  const pathname = usePathname();
  const atHome = pathname === "/";
  return (
    <Link
      href="/"
      transitionTypes={atHome ? undefined : NAV_BACK}
      aria-label="Layover home"
      onClick={(e) => {
        if (!atHome) return;
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      className="-ml-2 inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-control px-2 text-[15px] font-semibold text-ink hover:bg-sunk"
    >
      <BrandMark />
      Layover
    </Link>
  );
}
