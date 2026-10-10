"use client";
import { Gauge, SlidersHorizontal, Waypoints } from "lucide-react";
import type { PitchFacts } from "@/lib/jetflex/operator";
import { usd } from "@/lib/jetflex/time";
import { Card, Notice } from "./ui";

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Written to an operator. Every figure comes from the seeded fleet through operator.ts, and moves with your edits. */
export function OperatorPitch({ facts: f }: { facts: PitchFacts }) {
  return (
    <section className="mb-10" aria-labelledby="pitch-h">
      <Card className="p-5 sm:p-7">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-gold">For operators</p>
        <h2 id="pitch-h" className="display max-w-3xl text-2xl leading-tight sm:text-3xl">The empty legs you already have to fly can be offers travelers see.</h2>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-steel">
          JetFlex reads your schedule, finds the legs where an aircraft has to move empty, and puts them in front of travelers whose trips already fit. You set the price, decide what is published and can pull a leg any time. The figures below come from the sample fleet on this page and update as you change it.
        </p>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-warm"><Waypoints size={16} className="text-gold" aria-hidden />What is sitting in your schedule</h3>
            <p className="text-sm leading-relaxed text-steel">
              <span className="num text-warm">{f.legs}</span> repositioning legs across <span className="num text-warm">{f.fleet}</span> aircraft and <span className="num text-warm">{f.operators}</span> operators: about <span className="num text-warm">{f.emptyHours.toFixed(0)}</span> block hours that would otherwise fly with no one aboard, carrying a modeled <span className="num text-warm">{usd(f.positioningCost)}</span> in variable cost ({pct(f.controls.positioningShare)} of each leg’s charter estimate).
            </p>
          </div>
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-warm"><Gauge size={16} className="text-gold" aria-hidden />What JetFlex does with it</h3>
            <p className="text-sm leading-relaxed text-steel">
              <span className="num text-warm">{f.withDemand}</span> of <span className="num text-warm">{f.live}</span> live legs match at least one simulated traveler search. At an assumed {pct(f.conversion)} booking chance per ideal match, the model expects <span className="num text-warm">{usd(f.expected)}</span> of the <span className="num text-warm">{usd(f.gross)}</span> offered
              {f.recoveryShare != null && <>, roughly <span className="num text-warm">{pct(f.recoveryShare)}</span> of the modeled cost of flying those legs empty</>}.
              {f.top && <> The strongest today is <span className="num text-warm">{f.top.label}</span>: {usd(f.top.offer)} offered, {usd(f.top.expected)} expected, {f.top.matches} match{f.top.matches === 1 ? "" : "es"}.</>}
            </p>
          </div>
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-warm"><SlidersHorizontal size={16} className="text-gold" aria-hidden />What you control</h3>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-steel">
              <li><span className="text-warm">Price.</span> Travelers see exactly the offer you set{f.controls.lowestOffer != null && <> (lowest live offer now <span className="num">{usd(f.controls.lowestOffer)}</span>)</>}. One click applies the suggested or model-optimal price.</li>
              <li><span className="text-warm">Publish.</span> Nothing reaches travelers unless its toggle is on.</li>
              <li><span className="text-warm">Availability.</span> Mark a leg limited or unavailable and it leaves traveler search at once.</li>
            </ul>
          </div>
        </div>
        <div className="mt-6"><Notice tone="warn"><span><strong>Everything here is simulated.</strong> The fleet, schedules, traveler searches and prices are invented for this prototype; no operator has been contacted and nothing is bookable. Figures are model outputs under the assumptions stated above, not forecasts or commitments (handling cost {usd(f.controls.marginalCost)} per sold leg).</span></Notice></div>
      </Card>
    </section>
  );
}
