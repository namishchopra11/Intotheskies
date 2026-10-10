"use client";
import { Car, Gem, Plane, Repeat2 } from "lucide-react";
import { METROS } from "@/lib/jetflex/data";
import { tzOf } from "@/lib/jetflex/inventory";
import { fmtDay, fmtDur, fmtTime, usd } from "@/lib/jetflex/time";
import type { Itinerary, Mode, Segment } from "@/lib/jetflex/types";
import { Badge, cx } from "./ui";
import { MODE_COLOR } from "./RouteMap";

export const placeName = (p: string) => (p.startsWith("door:") ? `${METROS[p.slice(5)].short} (door)` : p);
export const clock = (abs: number, place: string) => fmtTime(abs, tzOf(place));
export const dayOf = (abs: number, place: string) => fmtDay(abs, tzOf(place));

export const ModeIcon = ({ mode, size = 16 }: { mode: Mode; size?: number }) => {
  const P = { commercial: Plane, charter: Gem, empty_leg: Repeat2, ground: Car }[mode];
  return <P size={size} strokeWidth={1.6} style={{ color: MODE_COLOR[mode] }} aria-hidden />;
};
const PROV: Record<Mode, string> = { commercial: "Simulated timetable & fare", charter: "Simulated charter quote", empty_leg: "Simulated operator offer", ground: "Modeled ground estimate" };

export function SegmentRow({ s, status, prev }: { s: Segment; status?: "ok" | "delayed" | "cancelled" | "missed"; prev?: Segment }) {
  const wait = prev ? s.dep - prev.arr : null;
  return (
    <li className={cx("grid grid-cols-[28px_1fr] gap-x-3 py-3 sm:grid-cols-[28px_1fr_auto]", status === "cancelled" || status === "missed" ? "opacity-60" : "")}>
      <span className="pt-0.5"><ModeIcon mode={s.mode} /></span>
      <div className="min-w-0">
        <p className={cx("text-sm", status === "cancelled" && "line-through")}>{s.label}</p>
        <p className="num mt-0.5 text-xs text-steel">
          {dayOf(s.dep, s.from)} · {clock(s.dep, s.from)} {placeName(s.from)} → {clock(s.arr, s.to)} {placeName(s.to)} · {fmtDur(s.arr - s.dep)}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-steel">
          <span>{PROV[s.mode]}</span>
          {wait != null && wait > 0 && <span>· {fmtDur(wait)} transfer buffer before</span>}
          {status && status !== "ok" && <Badge tone={status === "delayed" ? "warn" : "bad"}>{status === "delayed" ? "Delayed" : status === "missed" ? "Missed" : "Cancelled"}</Badge>}
        </p>
        {s.caveat && s.mode !== "commercial" && s.mode !== "ground" && <p className="mt-1 text-[11px] leading-snug text-warn/90">{s.caveat}</p>}
      </div>
      <p className="num col-start-2 mt-1 text-sm sm:col-start-3 sm:mt-0 sm:text-right">{usd(s.cost)}</p>
    </li>
  );
}

export function ItineraryBreakdown({ it }: { it: Itinerary }) {
  const flights = it.journeys.flatMap((j) => j.segments).filter((s) => s.mode !== "ground").reduce((a, s) => a + s.cost, 0);
  return (
    <div>
      {it.journeys.map((j) => (
        <section key={j.id} className="mb-4">
          <h4 className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-gold">
            {j.dir === "out" ? "Outbound" : "Return"}
            {j.match === "nearby" && <Badge tone="steel">Nearby airport</Badge>}
          </h4>
          {j.notes.map((n) => <p key={n} className="text-xs text-steel">{n}</p>)}
          <ul className="divide-y divide-line/70">{j.segments.map((s, i) => <SegmentRow key={s.id} s={s} prev={j.segments[i - 1]} />)}</ul>
        </section>
      ))}
      <dl className="num grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 border-t border-line pt-3 text-sm">
        <dt className="text-steel">Flights (aircraft and fares)</dt><dd className="text-right">{usd(flights)}</dd>
        <dt className="text-steel">Chauffeured ground transfers (modeled)</dt><dd className="text-right">{usd(it.groundCost)}</dd>
        <dt className="font-medium">Total for {it.pax} traveler{it.pax > 1 ? "s" : ""}</dt><dd className="text-right font-semibold text-gold">{usd(it.totalPrice)}</dd>
        <dt className="text-steel">Per person</dt><dd className="text-right">{usd(it.perPerson)}</dd>
      </dl>
    </div>
  );
}

export const riskLabel = (r: number) => (r < 0.18 ? "Low" : r < 0.32 ? "Moderate" : "Elevated");
export const riskTone = (r: number) => (r < 0.18 ? "ok" : r < 0.32 ? "warn" : "bad") as "ok" | "warn" | "bad";
