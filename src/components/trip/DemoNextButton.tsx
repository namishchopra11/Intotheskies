"use client";

import { usePathname, useRouter } from "next/navigation";
import { NAV_BACK, NAV_FORWARD, SignArrow } from "@/components/ui";
import { encodeShare } from "@/lib/domain/shareLink";
import { DEFAULT_SUMMARY_OPTIONS } from "@/lib/domain/summary";
import { leaveStartTrip } from "@/app/trip/leaveStartTrip";
import { useStoreReady, useTripStore } from "@/lib/store";
import { nextDemoStep } from "./demoSteps";
import { triggerFlightChange } from "./simulateChange";

/**
 * For presenting the app: a yellow "Next" key beside the column (bottom right on a phone) that walks through every screen
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
      className="ck-press fixed right-[max(16px,calc(50%-324px))] bottom-[max(env(safe-area-inset-bottom),16px)] z-50 inline-flex h-13 w-13 cursor-pointer items-center justify-center rounded-[4px] border-[3px] border-[#111] bg-[#ffcc00] text-[#111] shadow-[0_12px_30px_-8px_rgb(0_0_0/0.5)]"
    >
      <SignArrow size={24} className="ck-key-arrow" />
    </button>
  );
}
