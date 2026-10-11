"use client";

import { usePathname, useRouter } from "next/navigation";
import { Icon, NAV_BACK, NAV_FORWARD } from "@/components/ui";
import { encodeShare } from "@/lib/domain/shareLink";
import { DEFAULT_SUMMARY_OPTIONS } from "@/lib/domain/summary";
import { leaveStartTrip } from "@/app/trip/leaveStartTrip";
import { useStoreReady, useTripStore } from "@/lib/store";
import { nextDemoStep } from "./demoSteps";
import { triggerFlightChange } from "./simulateChange";

/**
 * For presenting the app: a yellow "Next" circle beside the column (bottom right on a phone) that walks through every screen
 * in order (see demoSteps.ts), setting up whatever the next screen needs. Switch it off in
 * Settings → Demo. Mounted once, in the root layout.
 */
export function DemoNextButton() {
  const ready = useStoreReady();
  const pathname = usePathname();
  const router = useRouter();
  const on = useTripStore((s) => s.settings.demoControls);
  const trip = useTripStore((s) => s.trip);
  const profile = useTripStore((s) => s.profile);

  if (!ready || !on) return null;
  // Someone opening a shared update on their own phone isn't presenting anything.
  if (pathname === "/s" && !profile) return null;

  const step = nextDemoStep(pathname, { trip, profile });

  const run = () => {
    const store = useTripStore.getState();
    switch (step.kind) {
      case "go":
        // Deeper screens slide in from the right; home and log in come back from the left.
        router.push(step.to, { transitionTypes: step.to === "/" || step.to === "/login" ? NAV_BACK : NAV_FORWARD });
        break;
      case "guest":
        store.signIn({ name: "", email: "", guest: true });
        router.push("/");
        break;
      case "sample":
        // Stays put: on Your trip, the empty form fades away and the sample's flights, hotel
        // and ride build up in its place.
        window.scrollTo({ top: 0, behavior: "smooth" });
        leaveStartTrip(() => useTripStore.getState().loadSampleTrip());
        break;
      case "change":
        triggerFlightChange();
        window.scrollTo({ top: 0, behavior: "smooth" });
        break;
      case "recipient": {
        const t = store.trip;
        if (t) router.push(`/s#${encodeShare(t, step.disruptionId, DEFAULT_SUMMARY_OPTIONS)}`, { transitionTypes: NAV_FORWARD });
        break;
      }
      case "restart":
        store.resetTrip();
        store.signOut();
        router.push("/login");
        break;
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      data-demo-next
      title={step.label}
      aria-label={`Demo: next, ${step.label}`}
      className="fixed right-[max(16px,calc(50%-324px))] bottom-[max(env(safe-area-inset-bottom),16px)] z-50 inline-flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-signal text-on-signal shadow-[0_8px_24px_rgb(0_0_0/0.25)]"
    >
      <Icon name="arrow-right" size={20} strokeWidth={2.5} />
    </button>
  );
}
