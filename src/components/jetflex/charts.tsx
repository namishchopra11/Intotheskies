"use client";
import type { Itinerary, Kind } from "@/lib/jetflex/types";
import { fmtDur, usd } from "@/lib/jetflex/time";
import { stagger, useElementWidth } from "./ui";

export const KIND_COLOR: Record<Kind, string> = { charter: "#D5B779", empty_leg: "#80C8C1", first_class: "#8294A8", hybrid: "#79C9A6" };
export const KIND_NAME: Record<Kind, string> = { charter: "Private charter", empty_leg: "Empty leg", first_class: "First class", hybrid: "Hybrid" };

/**
 * Cost against door-to-door time. Lower-left is better. Click or press Enter on a point to select it.
 * Drawn at the container's real pixel width so labels stay readable on a 360px phone.
 * The gold line is the price/time frontier: options not beaten on both axes by another option.
 */
export function Scatter({ items, selectedId, onSelect }: { items: Itinerary[]; selectedId?: string; onSelect: (id: string) => void }) {
  const [ref, measured] = useElementWidth<HTMLDivElement>();
  if (items.length < 2) return null;
  const W = Math.max(measured, 260);
  const narrow = W < 440;
  const [H, L, B, T, R] = [narrow ? 260 : 280, narrow ? 56 : 70, 38, 28, narrow ? 14 : 18];
  const [x0, x1] = [Math.min(...items.map((i) => i.totalPrice)), Math.max(...items.map((i) => i.totalPrice))];
  const [y0, y1] = [Math.min(...items.map((i) => i.door2doorMin)), Math.max(...items.map((i) => i.door2doorMin))];
  // Pad the extremes so dots do not sit on the axes.
  const pad = (a: number, b: number) => [a - (b - a) * 0.06 || a - 1, b + (b - a) * 0.06 || b + 1] as const;
  const [px0, px1] = pad(x0, x1);
  const [py0, py1] = pad(y0, y1);
  const px = (v: number) => L + ((v - px0) / (px1 - px0)) * (W - L - R);
  const py = (v: number) => H - B - ((v - py0) / (py1 - py0)) * (H - B - T);
  const ticks = (a: number, b: number, n: number) => Array.from({ length: n }, (_, k) => a + ((b - a) * k) / (n - 1));
  const xt = ticks(x0, x1, narrow ? 3 : 4);
  const yt = ticks(y0, y1, 4);
  const mono = { fontFamily: "var(--font-mono)" } as const;

  const sorted = [...items].sort((a, b) => a.totalPrice - b.totalPrice || a.door2doorMin - b.door2doorMin);
  const frontier: Itinerary[] = [];
  for (const i of sorted) if (!frontier.length || i.door2doorMin < frontier[frontier.length - 1].door2doorMin) frontier.push(i);
  const frontierD = frontier.length > 1 ? frontier.map((i, n) => `${n ? "L" : "M"}${px(i.totalPrice).toFixed(1)},${py(i.door2doorMin).toFixed(1)}`).join("") : null;
  const key = items.map((i) => i.id).join("|");

  return (
    <figure className="m-0">
      <div ref={ref} className="w-full">
        {measured > 0 && (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block max-w-full" role="group" aria-label="Scatter plot of total price against door-to-door time for every option">
            {xt.map((v) => (<g key={`x${v}`}><line x1={px(v)} x2={px(v)} y1={T} y2={H - B} stroke="#263a54" strokeDasharray="2 4" /><text x={px(v)} y={H - 20} textAnchor="middle" fontSize="11" fill="#8294A8" style={mono}>{usd(Math.round(v / 100) * 100)}</text></g>))}
            {yt.map((v) => (<g key={`y${v}`}><line x1={L} x2={W - R} y1={py(v)} y2={py(v)} stroke="#263a54" strokeDasharray="2 4" /><text x={L - 8} y={py(v) + 4} textAnchor="end" fontSize="11" fill="#8294A8" style={mono}>{fmtDur(v)}</text></g>))}
            <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="#2d4663" className="draw" pathLength={1} />
            <line x1={L} x2={L} y1={T} y2={H - B} stroke="#2d4663" className="draw" pathLength={1} />
            <text x={(W + L) / 2} y={H - 3} textAnchor="middle" fontSize="11" fill="#8294A8">Total trip price</text>
            <text x={4} y={11} fontSize="11" fill="#8294A8">Door-to-door time</text>
            {frontierD && <path key={`f${key}`} d={frontierD} fill="none" stroke="#D5B779" strokeOpacity="0.55" strokeWidth="1.5" pathLength={1} className="draw" style={{ ["--draw-delay" as string]: "300ms", ["--draw-d" as string]: "1.2s" }}><title>Price and time frontier</title></path>}
            {items.map((i, k) => {
              const on = i.id === selectedId;
              const go = () => onSelect(i.id);
              return (
                <g key={i.id} className="cursor-pointer" style={{ transform: `translate(${px(i.totalPrice)}px, ${py(i.door2doorMin)}px)`, transition: "transform .5s cubic-bezier(.2,.7,.2,1)" }}
                  onClick={go} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }} role="button" tabIndex={0} aria-pressed={on} aria-label={`${i.name}: ${usd(i.totalPrice)}, ${fmtDur(i.door2doorMin)}`}>
                  <circle r={16} fill="transparent" />
                  <circle r={on ? 8.5 : k === 0 ? 7 : 5.5} fill={KIND_COLOR[i.kind]} fillOpacity={on ? 1 : 0.75} stroke={on ? "#F5F4EF" : k === 0 ? "#D5B779" : "none"} strokeWidth={on ? 2 : 1.5} className="pop" style={stagger(k, 14)} />
                  <title>{`${i.name}\n${usd(i.totalPrice)} · ${fmtDur(i.door2doorMin)} · score ${i.score}`}</title>
                </g>
              );
            })}
          </svg>
        )}
      </div>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-steel">
        {(Object.keys(KIND_NAME) as Kind[]).map((k) => <span key={k} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_COLOR[k] }} />{KIND_NAME[k]}</span>)}
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-4 rounded bg-gold/60" />Best price-for-time frontier</span>
        <span className="sm:ml-auto">Lower-left is cheaper and faster</span>
      </figcaption>
    </figure>
  );
}

/** Where the score came from: each factor's weighted contribution. Bars grow in on mount. */
export function ScoreBars({ it }: { it: Itinerary }) {
  const max = Math.max(...it.parts.map((p) => p.weight * 100), 1);
  return (
    <ul className="space-y-2">
      {it.parts.filter((p) => p.weight > 0).sort((a, b) => b.weight - a.weight).map((p, n) => (
        <li key={p.key} className="grid grid-cols-[104px_1fr_58px] items-center gap-3 text-xs sm:grid-cols-[150px_1fr_72px]">
          <span className="text-steel">{p.label}</span>
          <span className="relative h-2 rounded-full bg-deep" aria-hidden>
            <span className="absolute inset-y-0 left-0 rounded-full bg-line" style={{ width: `${(p.weight * 100 * 100) / max}%` }} />
            <span className="grow absolute inset-y-0 left-0 rounded-full bg-gold" style={{ width: `${(p.points * 100) / max}%`, ...stagger(n) }} />
          </span>
          <span className="num text-right text-warm">{p.points.toFixed(1)}<span className="text-steel">/{(p.weight * 100).toFixed(0)}</span></span>
        </li>
      ))}
    </ul>
  );
}
