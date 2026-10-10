"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AIRPORTS, METROS } from "@/lib/jetflex/data";
import type { Itinerary, Mode, Segment } from "@/lib/jetflex/types";
import { fmtDur } from "@/lib/jetflex/time";

// Simplified contiguous-US outline (lon, lat). Decorative context only; no tiles, no network.
const US: [number, number][] = [[-124.7,48.4],[-123.3,49],[-95.15,49],[-95.15,49.4],[-94.6,48.7],[-93,48.6],[-91.5,48.1],[-89.6,48],[-90.5,47.3],[-92,46.7],[-90.4,46.6],[-88,47.4],[-87,46.5],[-84.6,46.5],[-84.7,45.8],[-83.5,46],[-83.3,45.1],[-82.4,43],[-83.1,42],[-82.7,41.5],[-80.5,42],[-79,42.8],[-79,43.3],[-76.5,43.5],[-75,44.9],[-71.5,45],[-70.8,45.4],[-70,46.7],[-69.2,47.45],[-68.3,47.35],[-67.8,47.07],[-67.8,45.7],[-67,44.8],[-68.5,44.3],[-70.2,43.6],[-70.7,42.9],[-70.8,42.3],[-70,41.8],[-71.4,41.4],[-72.9,41.2],[-74,40.6],[-74,39.8],[-74.9,38.9],[-75.2,38.2],[-75.9,37.1],[-76,36.9],[-75.5,35.3],[-76.5,34.7],[-77.9,33.9],[-79,33.2],[-80,32.5],[-81,31.5],[-81.4,30.2],[-80.6,28.4],[-80,26.8],[-80.1,25.6],[-80.5,25.1],[-81.1,25.2],[-81.8,26.1],[-82.7,27.5],[-82.8,28.9],[-84,30.1],[-85.3,29.7],[-86.5,30.4],[-88,30.3],[-89.4,30.2],[-89.2,29],[-90.5,29.1],[-92,29.6],[-93.8,29.7],[-94.8,29.3],[-96.5,28.3],[-97.4,27.2],[-97.2,25.9],[-99.1,26.4],[-99.5,27.5],[-100.3,28.3],[-101.4,29.8],[-102.4,29.8],[-103.1,29],[-104.5,29.6],[-104.9,30.6],[-106.5,31.8],[-108.2,31.8],[-108.2,31.3],[-111,31.3],[-114.8,32.5],[-117.1,32.5],[-117.3,33.1],[-118.4,33.8],[-119.2,34.1],[-120.5,34.5],[-120.7,35.2],[-121.9,36.6],[-122.5,37.5],[-123,38],[-123.7,39],[-124.4,40.4],[-124.1,41.8],[-124.5,42.8],[-124,44.5],[-124,46.2],[-124.1,47],[-124.7,48.4]];

const K = Math.cos((38 * Math.PI) / 180);
const proj = (lon: number, lat: number): [number, number] => [(lon + 125) * K * 10, (50 - lat) * 10];
const pt = (code: string): [number, number] => {
  if (code.startsWith("door:")) {
    const m = METROS[code.slice(5)];
    return proj(m.lon, m.lat);
  }
  return proj(AIRPORTS[code].lon, AIRPORTS[code].lat);
};
const OUTLINE = US.map(([lo, la], i) => `${i ? "L" : "M"}${proj(lo, la).map((n) => n.toFixed(1)).join(",")}`).join("") + "Z";

export const MODE_COLOR: Record<Mode, string> = { commercial: "#8294A8", charter: "#D5B779", empty_leg: "#80C8C1", ground: "#F5F4EF" };
export const MODE_NAME: Record<Mode, string> = { commercial: "First class", charter: "Private charter", empty_leg: "Empty leg", ground: "Ground" };

const arc = (a: [number, number], b: [number, number], bend = 0.14) => {
  const [mx, my] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  return `M${a[0]},${a[1]} Q${mx + dy * bend},${my - dx * bend} ${b[0]},${b[1]}`;
};

type Box = [number, number, number, number];
function useLerp(target: Box): Box {
  const [box, setBox] = useState<Box>(target);
  const cur = useRef(target);
  useEffect(() => {
    let raf = 0;
    const step = () => {
      const next = cur.current.map((v, i) => v + (target[i] - v) * 0.16) as Box;
      cur.current = next;
      setBox(next);
      if (next.some((v, i) => Math.abs(v - target[i]) > 0.05)) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return box;
}

export function RouteMap({ selected, others = [], onSelect }: { selected: Itinerary | null; others?: Itinerary[]; onSelect?: (id: string) => void }) {
  const segs: Segment[] = useMemo(() => selected?.journeys.flatMap((j) => j.segments) ?? [], [selected]);
  const flightSegs = segs.filter((s) => s.mode !== "ground");
  const target = useMemo<Box>(() => {
    const pts = (segs.length ? segs : []).flatMap((s) => [pt(s.from), pt(s.to)]);
    if (!pts.length) return [0, 0, 460, 280];
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const w = Math.max(x1 - x0, (y1 - y0) / 0.62, 70) * 1.35;
    const h = w * 0.62;
    const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2];
    return [cx - w / 2, cy - h / 2, w, h];
  }, [segs]);
  const box = useLerp(target);
  const scale = box[2] / 460; // keep strokes and labels a constant visual size
  const used = new Map<string, "origin" | "dest" | "via">();
  flightSegs.forEach((s, i) => {
    used.set(s.from, i === 0 && !used.has(s.from) ? "origin" : used.get(s.from) ?? "via");
    used.set(s.to, i === flightSegs.length - 1 ? "dest" : used.get(s.to) ?? "via");
  });
  const metros = new Set([...used.keys()].map((c) => AIRPORTS[c]?.metro).filter(Boolean));
  const nearby = Object.values(AIRPORTS).filter((a) => metros.has(a.metro) && !used.has(a.code));
  const labelSide = (code: string) => ([...used.keys()].indexOf(code) % 2 ? -1 : 1);

  return (
    <figure className="m-0">
      <div className="overflow-hidden rounded-xl border border-line bg-deep">
        <svg viewBox={`${box[0]} ${box[1]} ${box[2]} ${box[3]}`} className="block h-auto w-full" role="img" aria-label={selected ? `Route map for ${selected.name}` : "Route map"}>
          <defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#263a54" strokeWidth={0.3 * scale} opacity="0.5" /></pattern></defs>
          <rect x={box[0]} y={box[1]} width={box[2]} height={box[3]} fill="url(#grid)" />
          <path d={OUTLINE} fill="#13233a" stroke="#2d4663" strokeWidth={0.6 * scale} strokeLinejoin="round" />
          {/* other options, faint and clickable */}
          {others.filter((o) => o.id !== selected?.id).map((o) => {
            const d = o.journeys.flatMap((j) => j.segments).filter((s) => s.mode !== "ground").map((s) => arc(pt(s.from), pt(s.to))).join(" ");
            return (
              <g key={o.id} onClick={() => onSelect?.(o.id)} className="cursor-pointer" role="button" aria-label={`Show ${o.name}`}>
                <path d={d} fill="none" stroke="#8294A8" strokeOpacity="0.28" strokeWidth={1 * scale} />
                <path d={d} fill="none" stroke="transparent" strokeWidth={9 * scale} />
              </g>
            );
          })}
          {nearby.map((a) => {
            const [x, y] = pt(a.code);
            return <g key={a.code}><circle cx={x} cy={y} r={1.5 * scale} fill="none" stroke="#8294A8" strokeWidth={0.5 * scale} /><title>{`${a.code} · ${a.name} (nearby alternative)`}</title></g>;
          })}
          {segs.map((s, i) => {
            const [a, b] = [pt(s.from), pt(s.to)];
            if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.4) return null;
            const flight = s.mode !== "ground";
            return (
              <g key={s.id + i}>
                <path d={arc(a, b, flight ? 0.14 : 0.05)} fill="none" stroke={MODE_COLOR[s.mode]} strokeWidth={(flight ? 1.7 : 1) * scale} strokeLinecap="round"
                  strokeDasharray={s.mode === "ground" ? `${1.2 * scale} ${2 * scale}` : s.mode === "empty_leg" ? undefined : undefined} className={flight && s.mode === "empty_leg" ? "route-flow" : undefined} style={flight && s.mode === "empty_leg" ? { strokeDasharray: `${5 * scale} ${7 * scale}` } : undefined} />
                <title>{`${s.label}`}</title>
              </g>
            );
          })}
          {[...used.entries()].map(([code, role]) => {
            const [x, y] = pt(code);
            const side = labelSide(code);
            return (
              <g key={code}>
                <circle cx={x} cy={y} r={3 * scale} fill="#0B1320" stroke={role === "via" ? "#8294A8" : "#D5B779"} strokeWidth={1.2 * scale} />
                <circle cx={x} cy={y} r={1.1 * scale} fill={role === "via" ? "#8294A8" : "#D5B779"} />
                <text x={x + side * 5 * scale} y={y + 1.2 * scale} textAnchor={side > 0 ? "start" : "end"} fontSize={4.2 * scale} fill="#F5F4EF" style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{code}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-steel">
        {(["charter", "empty_leg", "commercial", "ground"] as Mode[]).map((m) => (
          <span key={m} className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 rounded" style={{ background: MODE_COLOR[m], opacity: m === "ground" ? 0.8 : 1 }} />{MODE_NAME[m]}</span>
        ))}
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full border border-steel" />Nearby airport</span>
        {selected && <span className="ml-auto num text-warm">{fmtDur(selected.door2doorMin)} door to door · simplified map</span>}
      </figcaption>
    </figure>
  );
}
