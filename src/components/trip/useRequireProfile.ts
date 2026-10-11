"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStoreReady, useTripStore } from "@/lib/store";

/**
 * Sends anyone who hasn't signed in (or chosen "Continue as guest") to /login. Returns true
 * once the screen can render. The recipient's page (/s) never uses this.
 */
const STARTED_KEY = "layover:started";

/** True once /login has been shown in this browser tab, so opening the link starts there. */
export function hasStartedSession(): boolean {
  try {
    return typeof window !== "undefined" && sessionStorage.getItem(STARTED_KEY) === "1";
  } catch {
    return true;
  }
}

export function markSessionStarted(): void {
  try {
    sessionStorage.setItem(STARTED_KEY, "1");
  } catch {
    // Storage blocked: the hook treats the session as started, so nothing loops.
  }
}

export function useRequireProfile(): boolean {
  const ready = useStoreReady();
  const signedIn = useTripStore((s) => s.profile !== null);
  const router = useRouter();

  useEffect(() => {
    if (ready && (!signedIn || !hasStartedSession())) router.replace("/login");
  }, [ready, signedIn, router]);

  return ready && signedIn && hasStartedSession();
}
