"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NotificationBanner } from "@/components/ui";
import { formatTimeText } from "@/lib/domain/time";
import { useStoreReady, useTripStore } from "@/lib/store";
import { useTimeFormat } from "@/lib/useTimeFormat";
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
  const displayTime = useTimeFormat();
  // The banner belongs to the screen it appeared on; it doesn't follow the traveler to /share.
  const [alert, setAlert] = useState<{ change: FlightAlertContent; path: string } | null>(null);

  // Only on the home screen: never on the recipient's /s page, mid-edit on /trip, or before
  // sign-in. With demo controls on, the presenter's "Next" button makes the change instead.
  const watching = ready && signedIn && !demo && hasTrip && disruptions === 0 && pathname === "/";

  useEffect(() => {
    if (!watching) return;
    const t = setTimeout(() => triggerFlightChange(), WATCH_DELAY_MS);
    return () => clearTimeout(t);
  }, [watching]);

  // The timer, the "Simulate a change" button and the demo's Next button all arrive here.
  useEffect(() => {
    const onChange = (e: Event) => {
      // Switched off in Settings: the trip still updates, there's just no alert.
      if (!useTripStore.getState().settings.notifications) return;
      const change = (e as CustomEvent<FlightAlertContent>).detail;
      setAlert({ change, path: window.location.pathname });
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

  if (!alert || alert.path !== pathname) return null;
  const { change } = alert;
  // "Simulated change · BA 286 is delayed": the banner shows the change as the title and says
  // "Simulated" in its small label, so the title fits on one line.
  const simulated = change.title.match(/^Simulated (?:flight )?change · (.+)$/);
  return (
    <NotificationBanner
      key={change.disruptionId}
      title={displayTime(simulated ? capitalize(simulated[1]) : change.title)}
      meta={simulated ? "Simulated" : "now"}
      lines={change.lines.map(displayTime)}
      onOpen={open}
      onDismiss={dismiss}
    />
  );
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
      const format = useTripStore.getState().settings.timeFormat;
      new Notification(change.title, { body: formatTimeText(change.lines.join("\n"), format), tag: "ck-change", icon: "/favicon.ico" });
    }
  } catch {
    // some browsers only allow notifications from a service worker
  }
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
