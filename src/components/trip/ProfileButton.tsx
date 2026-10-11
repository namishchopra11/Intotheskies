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

/** The signed-in person's initials in a circle, linking to Settings. */
export function ProfileButton() {
  const profile = useTripStore((s) => s.profile);
  if (!profile) return null;
  return (
    <Link
      href="/settings"
      aria-label="Settings"
      className="inline-flex h-11 w-11 items-center justify-center rounded-control hover:bg-sunk"
    >
      <span aria-hidden="true" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-band text-[13px] font-semibold text-on-band">
        {initials(profile)}
      </span>
    </Link>
  );
}
