"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NotificationBanner } from "@/components/ui";
import { useStoreReady, useTripStore } from "@/lib/store";
import { FLIGHT_CHANGE_EVENT, triggerFlightChange, type FlightAlertContent } from "./simulateChange";

// How long after a trip appears before the "airline" pushes the change.
const WATCH_DELAY_MS = 6000;

/**
 * Watches the trip for changes and tells the traveler the moment one lands. With no backend,
 * the change itself is simulated (see simulateChange.ts): a few seconds after a trip with no
 * disruptions loads, the airline delays and rebooks it. Mounted once, in the root layout.
 */
export function FlightWatcher() {
  const ready = useStoreReady();
  const hasTrip = useTripStore((s) => Boolean(s.trip));
  const signedIn = useTripStore((s) => s.profile !== null);
  // With demo controls on, the presenter's "Next" button makes the change instead.
  const demo = useTripStore((s) => s.settings.demoControls);
  const disruptions = useTripStore((s) => s.trip?.disruptions.length ?? 0);
  const pathname = usePathname();
  const router = useRouter();
  const [alert, setAlert] = useState<FlightAlertContent | null>(null);

  // The recipient's read-only page never changes anyone's trip, and nothing happens before
  // the traveler has signed in.
  const recipientPage = pathname === "/s" || pathname.startsWith("/s/");
  const watching =
    ready && signedIn && !demo && hasTrip && disruptions === 0 && !recipientPage && pathname !== "/login";

  useEffect(() => {
    if (!watching) return;
    const t = setTimeout(triggerFlightChange, WATCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [watching]);

  // Both the timer and the trip menu's "Trigger the change now" arrive here.
  useEffect(() => {
    const onChange = (e: Event) => {
      // Switched off in Settings: the trip still updates, there's just no alert.
      if (!useTripStore.getState().settings.notifications) return;
      const change = (e as CustomEvent<FlightAlertContent>).detail;
      setAlert(change);
      notifyDevice(change);
    };
    window.addEventListener(FLIGHT_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(FLIGHT_CHANGE_EVENT, onChange);
  }, []);

  const dismiss = useCallback(() => setAlert(null), []);
  const open = useCallback(() => {
    setAlert(null);
    if (pathname !== "/") router.push("/");
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }, [pathname, router]);

  if (!alert) return null;
  return <NotificationBanner key={alert.disruptionId} title={alert.title} lines={alert.lines} onOpen={open} onDismiss={dismiss} />;
}

/** A buzz, and a system notification too when the person has allowed them. */
function notifyDevice(change: FlightAlertContent) {
  try {
    navigator.vibrate?.([90, 60, 90]);
  } catch {
    // not supported
  }
  try {
    if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== "visible") {
      new Notification(change.title, { body: change.lines.join("\n"), tag: "ck-change", icon: "/favicon.ico" });
    }
  } catch {
    // some browsers only allow notifications from a service worker
  }
}
