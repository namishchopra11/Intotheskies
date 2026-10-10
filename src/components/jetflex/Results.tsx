"use client";
import { useState } from "react";
import { Check, ChevronDown, ListFilter, Sparkles } from "lucide-react";
import { FLEX_LABEL } from "@/lib/jetflex/journeys";
import { PRESETS } from "@/lib/jetflex/search";
import { fmtDur, usd } from "@/lib/jetflex/time";
import type { Excluded, Itinerary, Kind, SearchResult, TripRequest } from "@/lib/jetflex/types";
import { KIND_COLOR, KIND_NAME, ScoreBars } from "./charts";
import { riskLabel, riskTone } from "./Itinerary";
import { Badge, Button, Card, cx } from "./ui";

const KINDS: Kind[] = ["charter", "empty_leg", "first_class", "hybrid"];
const EMPTY: Record<Kind, string> = {
  charter: "No aircraft in the simulated fleet fits this party and window.",
  empty_leg: "No published empty leg fits this route, date, party size and window. Widen flexibility to look further.",
  first_class: "No scheduled first-class itinerary fits your window.",
  hybrid: "No valid hybrid itinerary exists for these constraints. JetFlex does not invent one.",
};

type Row = { label: string; get: (i: Itinerary) => string; num?: (i: Itinerary) => number; low?: boolean };
const ROWS: Row[] = [
  { label: "Total trip price", get: (i) => usd(i.totalPrice), num: (i) => i.totalPrice, low: true },
  { label: "Per person", get: (i) => usd(i.perPerson), num: (i) => i.perPerson, low: true },
  { label: "Door-to-door", get: (i) => fmtDur(i.door2doorMin), num: (i) => i.door2doorMin, low: true },
  { label: "Connections", get: (i) => (i.stops ? String(i.stops) : "Nonstop"), num: (i) => i.stops, low: true },
  { label: "Ground time", get: (i) => fmtDur(i.groundMin), num: (i) => i.groundMin, low: true },
  { label: "Departure vs preferred", get: (i) => (i.devMin ? `${fmtDur(i.devMin)} off` : "On time"), num: (i) => i.devMin, low: true },
  { label: "Schedule control", get: (i) => `${Math.round(i.control * 100)}%`, num: (i) => i.control },
  { label: "Schedule risk (modeled)", get: (i) => `${riskLabel(i.risk)} · ${Math.round(i.risk * 100)}%`, num: (i) => i.risk, low: true },
  { label: "Privacy", get: (i) => `${Math.round(i.privacy * 100)}%`, num: (i) => i.privacy },
  { label: "Saves vs charter", get: (i) => (i.kind === "charter" ? "Baseline" : i.savingsVsCharter == null ? "n/a" : i.savingsVsCharter >= 0 ? usd(i.savingsVsCharter) : `${usd(-i.savingsVsCharter)} more`) },
];

/** The best option of each mode, side by side, with the recommended one marked. */
export function Comparison({ items, selectedId, onSelect, topId }: { items: Itinerary[]; selectedId?: string; onSelect: (id: string) => void; topId?: string }) {
  const best = KINDS.map((k) => items.find((i) => i.kind === k));
  const present = best.filter(Boolean) as Itinerary[];
  const winner = (r: Row, i: Itinerary) => { if (!r.num || present.length < 2) return false; const v = present.map(r.num); const t = r.low ? Math.min(...v) : Math.max(...v); return r.num(i) === t && new Set(v).size > 1; };
  return (
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <caption className="sr-only">Best option in each travel mode, same party size and dates</caption>
        <thead>
          <tr>
            <th className="w-[170px] bg-panel/50 p-3" />
            {KINDS.map((k, n) => {
              const it = best[n];
              return (
                <th key={k} scope="col" className={cx("relative border-l border-line p-3 text-left align-top font-normal", it && it.id === selectedId ? "bg-panel-2" : "bg-panel/50")}>
                  <span className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.14em]" style={{ color: KIND_COLOR[k] }}><span className="h-2 w-2 rounded-full" style={{ background: KIND_COLOR[k] }} />{KIND_NAME[k]}</span>
                  {it ? (
                    <>
                      <button onClick={() => onSelect(it.id)} className="text-left text-[13px] leading-snug text-warm underline-offset-2 hover:underline">{it.name}</button>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {it.id === topId && <Badge tone="gold"><Sparkles size={10} />Recommended</Badge>}
                        {it.tags.map((t) => <Badge key={t} tone="teal">{t}</Badge>)}
                        {it.id === selectedId && <Badge tone="ok"><Check size={10} />Selected</Badge>}
                      </div>
                    </>
                  ) : <span className="text-xs text-steel">Not available</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.label} className="border-t border-line/70">
              <th scope="row" className="p-3 text-left text-xs font-normal text-steel">{r.label}</th>
              {best.map((it, n) => (
                <td key={KINDS[n]} className={cx("num border-l border-line/70 p-3", it && it.id === selectedId && "bg-panel-2/60", it && winner(r, it) ? "text-gold" : "text-warm")}>
                  {it ? r.get(it) : n === 0 || r.label !== ROWS[0].label ? "–" : ""}
                </td>
              ))}
            </tr>
          ))}
          {best.some((b) => !b) && (
            <tr className="border-t border-line/70">
              <th scope="row" className="p-3 text-left text-xs font-normal text-steel">Why not shown</th>
              {best.map((it, n) => <td key={KINDS[n]} className="border-l border-line/70 p-3 align-top text-xs leading-snug text-steel">{it ? "" : EMPTY[KINDS[n]]}</td>)}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function WhyPanel({ it, req, rank, total }: { it: Itinerary; req: TripRequest; rank: number; total: number }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="display text-xl">Why this recommendation?</h3>
        <Badge tone="gold">Rank {rank} of {total} · {it.score.toFixed(1)} pts</Badge>
      </div>
      <p className="mb-1 text-xs text-steel">Ranking: <span className="text-warm">{PRESETS[req.preset].label}</span> · {PRESETS[req.preset].blurb}</p>
      <div className="mt-3 space-y-2 text-[15px] leading-relaxed">
        {it.explanation.map((e, i) => <p key={i} className={e.startsWith("Empty legs") ? "text-warn" : undefined}>{e}</p>)}
      </div>
      {it.tradeoffs.length > 0 && (
        <div className="mt-4 rounded-xl border border-line bg-deep p-4">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.14em] text-warn">Trade-offs</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-steel">{it.tradeoffs.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
      <details className="group mt-4">
        <summary className="flex cursor-pointer items-center gap-1.5 text-sm text-gold"><ChevronDown size={14} className="transition-transform group-open:rotate-180" />Score breakdown (points earned / points available)</summary>
        <div className="mt-3"><ScoreBars it={it} /></div>
      </details>
    </Card>
  );
}

export function RankedList({ items, selectedId, onSelect }: { items: Itinerary[]; selectedId?: string; onSelect: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 7);
  return (
    <div>
      <ol className="space-y-2">
        {shown.map((it, n) => (
          <li key={it.id}>
            <button onClick={() => onSelect(it.id)} aria-pressed={it.id === selectedId}
              className={cx("grid w-full grid-cols-[28px_1fr_auto] items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors sm:grid-cols-[28px_1fr_90px_90px_80px]", it.id === selectedId ? "border-gold bg-panel-2" : "border-line bg-panel/50 hover:border-steel")}>
              <span className="num text-xs text-steel">{n + 1}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm">{it.name}</span>
                <span className="mt-1 flex flex-wrap gap-1"><Badge className="border-transparent" tone="steel"><span className="h-1.5 w-1.5 rounded-full" style={{ background: KIND_COLOR[it.kind] }} />{KIND_NAME[it.kind]}</Badge>{it.tags.map((t) => <Badge key={t} tone="teal">{t}</Badge>)}{it.recoveredFrom && <Badge tone="ok">Recovered</Badge>}</span>
              </span>
              <span className="num text-right text-sm sm:text-left">{usd(it.totalPrice)}<span className="block text-[11px] text-steel">{usd(it.perPerson)} pp</span></span>
              <span className="num hidden text-sm sm:block">{fmtDur(it.door2doorMin)}<span className="block text-[11px] text-steel">door to door</span></span>
              <span className="num hidden text-right text-sm sm:block"><Badge tone={riskTone(it.risk)}>{riskLabel(it.risk)}</Badge><span className="mt-1 block text-[11px] text-steel">{it.score.toFixed(1)} pts</span></span>
            </button>
          </li>
        ))}
      </ol>
      {items.length > 7 && <Button size="sm" className="mt-3" onClick={() => setAll(!all)}>{all ? "Show fewer" : `Show all ${items.length}`}</Button>}
    </div>
  );
}

export function ExcludedPanel({ excluded, req, onFlex }: { excluded: Excluded[]; req: TripRequest; onFlex: (f: TripRequest["flexH"]) => void }) {
  if (!excluded.length) return null;
  return (
    <details className="rounded-2xl border border-line bg-panel/40 p-4">
      <summary className="flex cursor-pointer items-center gap-2 text-sm"><ListFilter size={15} className="text-steel" />Options excluded by your constraints ({excluded.length})</summary>
      <ul className="mt-3 divide-y divide-line/60 text-sm">
        {excluded.map((e, i) => (
          <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span><span className="block">{e.label}</span><span className="text-xs text-steel">{e.reason}</span></span>
            {e.unlockFlexH != null && e.unlockFlexH > req.flexH && (
              <Button size="sm" onClick={() => onFlex(e.unlockFlexH as TripRequest["flexH"])}>Unlock at: {FLEX_LABEL[e.unlockFlexH as 2]}</Button>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

export const FlexProfile = ({ profile, current }: { profile: SearchResult["flexProfile"]; current: number }) => (
  <div className="mt-2 grid grid-cols-5 gap-1 text-center" aria-label="Empty-leg itineraries available at each flexibility setting">
    {profile.map((p) => (
      <div key={p.flexH} className={cx("rounded-lg border px-1 py-1.5", p.flexH === current ? "border-gold/60 bg-gold/5" : "border-line")}>
        <p className="num text-sm text-teal">{p.emptyLegs}</p>
        <p className="text-[10px] leading-tight text-steel">{p.flexH === 0 ? "Fixed" : p.flexH === 24 ? "Day" : `±${p.flexH}h`}</p>
      </div>
    ))}
    <p className="col-span-5 mt-0.5 text-left text-[11px] text-steel">Empty-leg itineraries available at each setting</p>
  </div>
);
