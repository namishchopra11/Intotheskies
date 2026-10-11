"use client";

import { Sheet } from "@/components/ui";
import { useTripStore } from "@/lib/store";
import { SCENARIOS, triggerFlightChange, type Scenario } from "./simulateChange";

/** Pick which simulated airline change to play. Each pick restarts the demo trip first. */
export function ScenarioSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const loadSampleTrip = useTripStore((s) => s.loadSampleTrip);
  const pick = (scenario: Scenario) => {
    onClose();
    loadSampleTrip();
    triggerFlightChange(scenario);
  };
  return (
    <Sheet open={open} onClose={onClose} title="Pick a scenario">
      <div className="flex flex-col gap-3 pt-2">
        <p className="text-[14px] leading-snug text-ink-2">
          The airline feed is simulated. Pick what happens to the sample trip and watch your plan rebuild.
        </p>
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => pick(s.id)}
            className="ck-key ck-key-secondary flex min-h-15 cursor-pointer flex-col items-start justify-center gap-0.5 rounded-control border-2 border-ink bg-surface px-5 py-2 text-left text-ink"
          >
            <span className="text-[17px] font-semibold">{s.label}</span>
            <span className="text-[14px] text-ink-2">{s.hint}</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
