"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStoreReady, useTripStore } from "@/lib/store";

/**
 * Sends anyone who hasn't signed in (or chosen "Continue as guest") to /login. Returns true
 * once the screen can render. The recipient's page (/s) never uses this.
 */
export function useRequireProfile(): boolean {
  const ready = useStoreReady();
  const signedIn = useTripStore((s) => s.profile !== null);
  const router = useRouter();

  useEffect(() => {
    if (ready && !signedIn) router.replace("/login");
  }, [ready, signedIn, router]);

  return ready && signedIn;
}
