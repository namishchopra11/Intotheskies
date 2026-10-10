"use client";
import { useId } from "react";
import { AIRPORTS } from "@/lib/jetflex/data";
import { revenueChange, type RevenueBucket, type RevenueProjection, type RevenueRow } from "@/lib/jetflex/operator";
import { fmtDate, fmtHHmm, localDate, localHHmm, usd } from "@/lib/jetflex/time";
import { Badge, Card, cx, Toggle } from "./ui";

const TEAL = "#80C8C1";
const GOLD = "#D5B779";
const STEEL = "#8294A8";

/** One stacked bar. Solid = expected to sell, hatched = on the market but unsold, dashed outline = not on the market. */
function Bar({ b, max, hatch, label }: { b: Pick<RevenueBucket, "expected" | "unsold" | "withheld">; max: number; hatch: string; label: string }) {
  const w = (v: number) => (max > 0 ? (v / max) * 100 : 0);
  const e = w(b.expected), u = w(b.unsold), h = w(b.withheld);
  return (
    <svg width="100%" height="14" role="img" aria-label={label} className="block overflow-visible">
      <rect x="0" y="0" width="100%" height="14" rx="3" fill="#0E1828" />
      <g className="jf-bar">
        {e > 0 && <rect x="0%" y="0" width={`${e}%`} height="14" rx="3" fill={TEAL} />}
        {u > 0 && <rect x={`${e}%`} y="0" width={`${u}%`} height="14" fill={`url(#${hatch})`} stroke={GOLD} strokeWidth="1" />}
        {h > 0 && <rect x={`${e + u}%`} y="0.5" width={`${h}%`} height="13" fill="none" stroke={STEEL} strokeWidth="1" strokeDasharray="3 3" />}
      </g>
    </svg>
  );
}

const when = (r: RevenueRow) => { const tz = AIRPORTS[r.from].tz; return `${fmtDate(localDate(r.earliest, tz))} ${fmtHHmm(localHHmm(r.earliest, tz))}`; };
const STATE = { live: ["ok", "On market"], unpublished: ["steel", "Unpublished"], unavailable: ["bad", "Unavailable"] } as const;
const signed = (n: number) => (n === 0 ? "no change" : `${n > 0 ? "+" : "−"}${usd(Math.abs(n))}`);

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-steel" aria-label="Chart key">
      <li className="inline-flex items-center gap-2"><span className="h-3 w-5 rounded-sm" style={{ background: TEAL }} aria-hidden />Expected to sell (solid)</li>
      <li className="inline-flex items-center gap-2"><span className="h-3 w-5 rounded-sm border" style={{ borderColor: GOLD, backgroundImage: `repeating-linear-gradient(45deg, ${GOLD} 0 2px, transparent 2px 5px)` }} aria-hidden />Unsold or at risk (hatched)</li>
      <li className="inline-flex items-center gap-2"><span className="h-3 w-5 rounded-sm border border-dashed" style={{ borderColor: STEEL }} aria-hidden />Not on the market (dashed)</li>
    </ul>
  );
}

export function OperatorRevenueChart({ projection, baseline, nextWeek, onNextWeek }: { projection: RevenueProjection; baseline: RevenueProjection; nextWeek: boolean; onNextWeek: (v: boolean) => void }) {
  const hatch = `hatch-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const { total, weeks } = projection;
  const rows = projection.rows.filter((r) => nextWeek || r.week === 0);
  const rowMax = Math.max(1, ...rows.map((r) => r.offer));
  const weekMax = Math.max(1, ...weeks.map((w) => w.gross));
  const chg = revenueChange(total, baseline.total);
  const edited = chg.expected !== 0 || chg.unsold !== 0 || chg.withheld !== 0;
  const WEEK = ["This week", "Following week"];
  return (
    <section className="mb-10" aria-labelledby="rev-h">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div><h2 id="rev-h" className="display text-2xl">Revenue view</h2><p className="mt-1 max-w-2xl text-sm text-steel">What each empty leg is worth right now, split into what the model expects to sell, what stays unsold on the market and what you are holding back. Change a price, publish toggle or availability below and this redraws.</p></div>
        <label className="flex items-center gap-2 text-sm text-steel"><Toggle label="List following week legs by leg" checked={nextWeek} onChange={onNextWeek} />List following week by leg</label>
      </div>
      <Card className="space-y-6 p-5 sm:p-6">
        {/* Hidden defs shared by every bar. */}
        <svg width="0" height="0" aria-hidden className="absolute">
          <defs><pattern id={hatch} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#0E1828" /><line x1="0" y1="0" x2="0" y2="6" stroke={GOLD} strokeWidth="2" /></pattern></defs>
        </svg>

        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div><dt className="text-xs uppercase tracking-[0.1em] text-steel">Expected to sell</dt><dd className="num mt-1 text-2xl text-teal">{usd(total.expected)}</dd><dd className="mt-1 text-xs text-steel">Offer × model confidence across {total.live} live legs, both weeks.</dd></div>
          <div><dt className="text-xs uppercase tracking-[0.1em] text-steel">Unsold or at risk</dt><dd className="num mt-1 text-2xl text-gold">{usd(total.unsold)}</dd><dd className="mt-1 text-xs text-steel">Offered value the model does not expect to book.</dd></div>
          <div><dt className="text-xs uppercase tracking-[0.1em] text-steel">Not on the market</dt><dd className="num mt-1 text-2xl text-warm">{usd(total.withheld)}</dd><dd className="mt-1 text-xs text-steel">{total.legs - total.live} leg{total.legs - total.live === 1 ? "" : "s"} unpublished or marked unavailable.</dd></div>
        </dl>
        <p className={cx("rounded-xl border px-3.5 py-2.5 text-sm", edited ? "border-gold/40 bg-gold/5 text-warm" : "border-line text-steel")} role="status">
          {edited
            ? <>Your edits versus the seeded defaults: expected to sell <strong className="num">{signed(chg.expected)}</strong>, unsold <strong className="num">{signed(chg.unsold)}</strong>, not on market <strong className="num">{signed(chg.withheld)}</strong>.</>
            : "No edits yet. Everything shown is the seeded default for the sample fleet."}
        </p>

        <Legend />

        <div>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-gold">By week</h3>
          <ul className="space-y-3">
            {weeks.map((w, i) => (
              <li key={i}>
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-sm"><span>{WEEK[i]} <span className="text-xs text-steel">· {w.legs} legs</span></span><span className="num text-xs text-steel">{usd(w.expected)} expected of {usd(w.gross)} offered</span></div>
                <Bar b={w} max={weekMax} hatch={hatch} label={`${WEEK[i]}: ${usd(w.expected)} expected to sell, ${usd(w.unsold)} unsold, ${usd(w.withheld)} not on the market`} />
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-gold">By leg · bar length is the offer price</h3>
          <ul className="space-y-3.5">
            {rows.map((r) => {
              const [tone, text] = STATE[r.state];
              return (
                <li key={r.legId}>
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                    <span className="text-sm">{r.label} <span className="num text-xs text-steel">· {when(r)} · {r.aircraftId}</span></span>
                    <span className="flex items-center gap-2"><Badge tone={tone}>{text}</Badge><span className="num text-sm text-warm">{usd(r.offer)}</span></span>
                  </div>
                  <Bar b={r} max={rowMax} hatch={hatch} label={`${r.label}: ${usd(r.expected)} expected, ${usd(r.unsold)} unsold, ${usd(r.withheld)} not on the market`} />
                  <p className="num mt-1 text-[11px] text-steel">{r.state === "live" ? `${usd(r.expected)} expected · ${usd(r.unsold)} unsold · ${r.matches} match${r.matches === 1 ? "" : "es"}` : `${usd(r.withheld)} held back · ${r.state === "unpublished" ? "publish it to put it in front of travelers" : "withdrawn from traveler search"}`}</p>
                </li>
              );
            })}
          </ul>
        </div>

        <details className="rounded-xl border border-line p-3 text-sm">
          <summary className="cursor-pointer text-steel">View the same numbers as a table</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="num w-full min-w-[460px] text-xs">
              <caption className="sr-only">Offer value of each detected empty leg, split into expected, unsold and not on the market</caption>
              <thead><tr className="text-left text-steel">{["Leg", "Status", "Offer", "Expected", "Unsold", "Held back"].map((h) => <th key={h} scope="col" className="pb-2 pr-3 font-normal">{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((r) => <tr key={r.legId} className="border-t border-line/60"><th scope="row" className="py-1.5 pr-3 text-left font-normal">{r.label} · {when(r)}</th><td className="pr-3">{STATE[r.state][1]}</td><td className="pr-3">{usd(r.offer)}</td><td className="pr-3">{usd(r.expected)}</td><td className="pr-3">{usd(r.unsold)}</td><td>{usd(r.withheld)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </details>
        <p className="text-[11px] leading-snug text-steel">Illustrative model, not a forecast. Expected = offer × confidence, where confidence combines how well simulated traveler searches match the leg with its availability risk. All demand and prices are simulated.</p>
      </Card>
    </section>
  );
}
