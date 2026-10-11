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
 * For presenting the app: a "Next" pill in the bottom right that walks through every screen
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
      aria-label={`Demo: next, ${step.label}`}
      className="fixed right-4 bottom-[max(env(safe-area-inset-bottom),16px)] z-50 inline-flex h-11 max-w-[calc(100vw-96px)] cursor-pointer items-center gap-2 rounded-full border border-line bg-band pr-2 pl-4 text-[14px] font-semibold text-on-band shadow-[0_8px_24px_rgb(0_0_0/0.25)]"
    >
      <span className="font-num text-[11px] tracking-[0.08em] uppercase opacity-60">Next</span>
      <span className="truncate">{step.label}</span>
      <span aria-hidden="true" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-signal text-on-signal">
        <Icon name="arrow-right" size={16} strokeWidth={2.5} />
      </span>
    </button>
  );
}
