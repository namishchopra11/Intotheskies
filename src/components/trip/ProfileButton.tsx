"use client";

import Link from "next/link";
import { useTripStore } from "@/lib/store";
import type { Profile } from "@/lib/types";

/** "Alex Morgan" -> "AM"; a guest is "G". */
export function initials(p: Profile): string {
  const words = p.name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return p.guest ? "G" : (p.email[0] ?? "?").toUpperCase();
  return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
}

/** The signed-in person's initials on a small plate, linking to Settings. */
export function ProfileButton() {
  const profile = useTripStore((s) => s.profile);
  if (!profile) return null;
  return (
    <Link
      href="/settings"
      transitionTypes={["nav-forward"]}
      aria-label="Settings"
      data-tour="profile"
      className="ck-press inline-flex h-11 w-11 items-center justify-center rounded-control"
    >
      <span aria-hidden="true" className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-key font-display text-[17px] font-bold text-on-key">
        {initials(profile)}
      </span>
    </Link>
  );
}
