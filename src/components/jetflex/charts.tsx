"use client";
import type { Itinerary, Kind } from "@/lib/jetflex/types";
import { fmtDur, usd } from "@/lib/jetflex/time";

export const KIND_COLOR: Record<Kind, string> = { charter: "#D5B779", empty_leg: "#80C8C1", first_class: "#8294A8", hybrid: "#79C9A6" };
export const KIND_NAME: Record<Kind, string> = { charter: "Private charter", empty_leg: "Empty leg", first_class: "First class", hybrid: "Hybrid" };

/** Cost against door-to-door time. Lower-left is better. Click a point to select it. */
export function Scatter({ items, selectedId, onSelect }: { items: Itinerary[]; selectedId?: string; onSelect: (id: string) => void }) {
  if (items.length < 2) return null;
  const [W, H, L, B, T, R] = [560, 260, 70, 34, 14, 16];
  const [x0, x1] = [Math.min(...items.map((i) => i.totalPrice)), Math.max(...items.map((i) => i.totalPrice))];
  const [y0, y1] = [Math.min(...items.map((i) => i.door2doorMin)), Math.max(...items.map((i) => i.door2doorMin))];
  const px = (v: number) => L + ((v - x0) / (x1 - x0 || 1)) * (W - L - R);
  const py = (v: number) => H - B - ((v - y0) / (y1 - y0 || 1)) * (H - B - T);
  const ticks = (a: number, b: number) => [0, 1, 2, 3].map((k) => a + ((b - a) * k) / 3);
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Scatter plot of total price against door-to-door time for every option">
        {ticks(x0, x1).map((v) => (<g key={v}><line x1={px(v)} x2={px(v)} y1={T} y2={H - B} stroke="#263a54" strokeDasharray="2 4" /><text x={px(v)} y={H - 14} textAnchor="middle" fontSize="10" fill="#8294A8" style={{ fontFamily: "var(--font-mono)" }}>{usd(Math.round(v / 100) * 100)}</text></g>))}
        {ticks(y0, y1).map((v) => (<g key={v}><line x1={L} x2={W - R} y1={py(v)} y2={py(v)} stroke="#263a54" strokeDasharray="2 4" /><text x={L - 8} y={py(v) + 3} textAnchor="end" fontSize="10" fill="#8294A8" style={{ fontFamily: "var(--font-mono)" }}>{fmtDur(v)}</text></g>))}
        <text x={(W + L) / 2} y={H - 1} textAnchor="middle" fontSize="10" fill="#8294A8">Total trip price</text>
        <text transform={`translate(10 ${(H - B) / 2}) rotate(-90)`} textAnchor="middle" fontSize="10" fill="#8294A8">Door-to-door time</text>
        {items.map((i, k) => {
          const on = i.id === selectedId;
          return (
            <g key={i.id} onClick={() => onSelect(i.id)} className="cursor-pointer" role="button" aria-label={`${i.name}: ${usd(i.totalPrice)}, ${fmtDur(i.door2doorMin)}`}>
              <circle cx={px(i.totalPrice)} cy={py(i.door2doorMin)} r={on ? 8 : k === 0 ? 6.5 : 5} fill={KIND_COLOR[i.kind]} fillOpacity={on ? 1 : 0.7} stroke={on ? "#F5F4EF" : k === 0 ? "#D5B779" : "none"} strokeWidth={on ? 2 : 1.5} />
              <title>{`${i.name}\n${usd(i.totalPrice)} · ${fmtDur(i.door2doorMin)} · score ${i.score}`}</title>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-steel">
        {(Object.keys(KIND_NAME) as Kind[]).map((k) => <span key={k} className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_COLOR[k] }} />{KIND_NAME[k]}</span>)}
        <span className="ml-auto">Lower-left is cheaper and faster</span>
      </figcaption>
    </figure>
  );
}

/** Where the score came from: each factor's weighted contribution. */
export function ScoreBars({ it }: { it: Itinerary }) {
  const max = Math.max(...it.parts.map((p) => p.weight * 100), 1);
  return (
    <ul className="space-y-2">
      {it.parts.filter((p) => p.weight > 0).sort((a, b) => b.weight - a.weight).map((p) => (
        <li key={p.key} className="grid grid-cols-[120px_1fr_64px] items-center gap-3 text-xs sm:grid-cols-[150px_1fr_72px]">
          <span className="text-steel">{p.label}</span>
          <span className="relative h-2 rounded-full bg-deep" aria-hidden>
            <span className="absolute inset-y-0 left-0 rounded-full bg-line" style={{ width: `${(p.weight * 100 * 100) / max}%` }} />
            <span className="absolute inset-y-0 left-0 rounded-full bg-gold" style={{ width: `${(p.points * 100) / max}%` }} />
          </span>
          <span className="num text-right text-warm">{p.points.toFixed(1)}<span className="text-steel">/{(p.weight * 100).toFixed(0)}</span></span>
        </li>
      ))}
    </ul>
  );
}
