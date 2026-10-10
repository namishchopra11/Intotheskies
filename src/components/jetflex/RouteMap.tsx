"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AIRPORTS, METROS } from "@/lib/jetflex/data";
import type { Itinerary, Mode, Segment } from "@/lib/jetflex/types";
import { fmtDur } from "@/lib/jetflex/time";
import { useElementWidth, useReducedMotion } from "./ui";

// Simplified contiguous-US outline (lon, lat). Decorative context only; no tiles, no network.
const US: [number, number][] = [[-124.7,48.4],[-123.3,49],[-95.15,49],[-95.15,49.4],[-94.6,48.7],[-93,48.6],[-91.5,48.1],[-89.6,48],[-90.5,47.3],[-92,46.7],[-90.4,46.6],[-88,47.4],[-87,46.5],[-84.6,46.5],[-84.7,45.8],[-83.5,46],[-83.3,45.1],[-82.4,43],[-83.1,42],[-82.7,41.5],[-80.5,42],[-79,42.8],[-79,43.3],[-76.5,43.5],[-75,44.9],[-71.5,45],[-70.8,45.4],[-70,46.7],[-69.2,47.45],[-68.3,47.35],[-67.8,47.07],[-67.8,45.7],[-67,44.8],[-68.5,44.3],[-70.2,43.6],[-70.7,42.9],[-70.8,42.3],[-70,41.8],[-71.4,41.4],[-72.9,41.2],[-74,40.6],[-74,39.8],[-74.9,38.9],[-75.2,38.2],[-75.9,37.1],[-76,36.9],[-75.5,35.3],[-76.5,34.7],[-77.9,33.9],[-79,33.2],[-80,32.5],[-81,31.5],[-81.4,30.2],[-80.6,28.4],[-80,26.8],[-80.1,25.6],[-80.5,25.1],[-81.1,25.2],[-81.8,26.1],[-82.7,27.5],[-82.8,28.9],[-84,30.1],[-85.3,29.7],[-86.5,30.4],[-88,30.3],[-89.4,30.2],[-89.2,29],[-90.5,29.1],[-92,29.6],[-93.8,29.7],[-94.8,29.3],[-96.5,28.3],[-97.4,27.2],[-97.2,25.9],[-99.1,26.4],[-99.5,27.5],[-100.3,28.3],[-101.4,29.8],[-102.4,29.8],[-103.1,29],[-104.5,29.6],[-104.9,30.6],[-106.5,31.8],[-108.2,31.8],[-108.2,31.3],[-111,31.3],[-114.8,32.5],[-117.1,32.5],[-117.3,33.1],[-118.4,33.8],[-119.2,34.1],[-120.5,34.5],[-120.7,35.2],[-121.9,36.6],[-122.5,37.5],[-123,38],[-123.7,39],[-124.4,40.4],[-124.1,41.8],[-124.5,42.8],[-124,44.5],[-124,46.2],[-124.1,47],[-124.7,48.4]];

export const MODE_COLOR: Record<Mode, string> = { commercial: "#8294A8", charter: "#D5B779", empty_leg: "#80C8C1", ground: "#F5F4EF" };
export const MODE_NAME: Record<Mode, string> = { commercial: "First class", charter: "Private charter", empty_leg: "Empty leg", ground: "Ground" };

type P = [number, number];
type Box = [number, number, number, number];

// Map units: roughly 10 per degree of latitude, longitude scaled by cos(38°).
const K = Math.cos((38 * Math.PI) / 180);
const proj = (lon: number, lat: number): P => [(lon + 125) * K * 10, (50 - lat) * 10];
const geo = (code: string): P => {
  if (code.startsWith("door:")) {
    const m = METROS[code.slice(5)];
    return [m.lon, m.lat];
  }
  const a = AIRPORTS[code];
  return [a.lon, a.lat];
};
const pt = (code: string): P => proj(...geo(code));
const label = (code: string) => (code.startsWith("door:") ? METROS[code.slice(5)].short : code);
const OUTLINE: P[] = US.map(([lo, la]) => proj(lo, la));

/** Points along the great circle between two places (projected), lifted into a gentle arc. */
function arcPoints(from: string, to: string, steps: number, lift: number): P[] {
  const [lon1, lat1] = geo(from).map((d) => (d * Math.PI) / 180);
  const [lon2, lat2] = geo(to).map((d) => (d * Math.PI) / 180);
  const d = 2 * Math.asin(Math.sqrt(Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2));
  const a = pt(from);
  const b = pt(to);
  if (d < 1e-6) return [a, b];
  const raw: P[] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const [A, B] = [Math.sin((1 - f) * d) / Math.sin(d), Math.sin(f * d) / Math.sin(d)];
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    raw.push(proj((Math.atan2(y, x) * 180) / Math.PI, (Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI));
  }
  if (!lift) return raw;
  // Push the middle of the arc sideways (towards the top of the map) so short hops still read as flights.
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const len = Math.hypot(dx, dy) || 1;
  let [nx, ny] = [dy / len, -dx / len];
  if (ny > 0 || (Math.abs(ny) < 1e-6 && nx > 0)) [nx, ny] = [-nx, -ny];
  return raw.map(([x, y], i) => {
    const s = Math.sin(Math.PI * (i / steps)) * len * lift;
    return [x + nx * s, y + ny * s] as P;
  });
}

const lerpBox = (a: Box, b: Box, t: number): Box => a.map((v, i) => v + (b[i] - v) * t) as Box;
function useCamera(target: Box): Box {
  const reduced = useReducedMotion();
  const [box, setBox] = useState<Box>(target);
  const cur = useRef<Box>(target);
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const step = () => {
      const next = lerpBox(cur.current, target, 0.14);
      cur.current = next;
      setBox(next);
      if (next.some((v, i) => Math.abs(v - target[i]) > 0.05)) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced]);
  return reduced ? target : box;
}

const pathOf = (pts: P[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");

/** Position and heading at fraction f (0..1) of the combined length of several polylines. */
function pointAlong(lines: P[][], f: number): { x: number; y: number; deg: number } | null {
  const lens = lines.map((l) => l.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - l[i][0], p[1] - l[i][1]), 0));
  const total = lens.reduce((a, b) => a + b, 0);
  if (!total) return null;
  let at = Math.min(Math.max(f, 0), 1) * total;
  for (let n = 0; n < lines.length; n++) {
    if (at > lens[n] && n < lines.length - 1) { at -= lens[n]; continue; }
    const l = lines[n];
    for (let i = 1; i < l.length; i++) {
      const seg = Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]);
      if (at <= seg || i === l.length - 1) {
        const t = seg ? Math.min(at / seg, 1) : 0;
        return { x: l[i - 1][0] + (l[i][0] - l[i - 1][0]) * t, y: l[i - 1][1] + (l[i][1] - l[i - 1][1]) * t, deg: (Math.atan2(l[i][1] - l[i - 1][1], l[i][0] - l[i - 1][0]) * 180) / Math.PI };
      }
      at -= seg;
    }
  }
  return null;
}

const PLANE = "M9 0L-2 -2.2L-6 -8.5L-8.4 -8.5L-5.4 -1.6L-9.4 -1.4L-11 -4.2L-12.6 -4.2L-11.6 0L-12.6 4.2L-11 4.2L-9.4 1.4L-5.4 1.6L-8.4 8.5L-6 8.5L-2 2.2Z";

/** The aircraft. Flies the whole selected route on a loop; with reduced motion it just sits mid-route. */
function Plane({ lines }: { lines: P[][] }) {
  const reduced = useReducedMotion();
  const g = useRef<SVGGElement>(null);
  const latest = useRef(lines);
  useEffect(() => { latest.current = lines; });
  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let t0: number | null = null;
    const len = latest.current.reduce((a, l) => a + l.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - l[i][0], p[1] - l[i][1]), 0), 0);
    const fly = Math.min(Math.max(len / 150, 2.4), 6) * 1000;
    const hold = 1100;
    const tick = (now: number) => {
      t0 ??= now;
      const phase = (now - t0) % (fly + hold);
      const f = Math.min(phase / fly, 1);
      const e = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
      const p = pointAlong(latest.current, e);
      if (p && g.current) {
        g.current.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.deg.toFixed(1)})`);
        g.current.setAttribute("opacity", phase > fly ? String(Math.max(0, 1 - (phase - fly) / hold)) : String(Math.min(1, phase / 250)));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);
  const rest = reduced ? pointAlong(lines, 0.5) : null;
  if (!lines.length) return null;
  return (
    <g ref={g} transform={rest ? `translate(${rest.x.toFixed(1)} ${rest.y.toFixed(1)}) rotate(${rest.deg.toFixed(1)})` : undefined} opacity={rest ? 1 : 0} pointerEvents="none">
      <path d={PLANE} transform="scale(1.15)" fill="#F5F4EF" stroke="#0B1320" strokeWidth="1.1" strokeLinejoin="round" />
    </g>
  );
}

type Role = "origin" | "dest" | "via";
/** Greedy label placement: try 8 positions around each airport and take the first that stays inside the map and clear of other labels and dots. */
function placeLabels(items: { code: string; at: P; role: Role }[], w: number, h: number, dots: P[]) {
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  const order = [...items].sort((a, b) => (a.role === "via" ? 1 : 0) - (b.role === "via" ? 1 : 0));
  const out = new Map<string, { x: number; y: number; anchor: "start" | "end" | "middle" }>();
  const hit = (r: { x: number; y: number; w: number; h: number }, o: { x: number; y: number; w: number; h: number }) => r.x < o.x + o.w && o.x < r.x + r.w && r.y < o.y + o.h && o.y < r.y + r.h;
  for (const it of order) {
    const bw = it.code.length * 7.6 + 4;
    const bh = 14;
    const [x, y] = it.at;
    const cands: { x: number; y: number; anchor: "start" | "end" | "middle"; box: { x: number; y: number; w: number; h: number } }[] = [
      { x: x + 11, y: y + 4, anchor: "start", box: { x: x + 9, y: y - 8, w: bw, h: bh } },
      { x: x - 11, y: y + 4, anchor: "end", box: { x: x - 9 - bw, y: y - 8, w: bw, h: bh } },
      { x, y: y - 11, anchor: "middle", box: { x: x - bw / 2, y: y - 11 - bh + 2, w: bw, h: bh } },
      { x, y: y + 20, anchor: "middle", box: { x: x - bw / 2, y: y + 8, w: bw, h: bh } },
      { x: x + 10, y: y - 10, anchor: "start", box: { x: x + 8, y: y - 10 - bh + 2, w: bw, h: bh } },
      { x: x - 10, y: y - 10, anchor: "end", box: { x: x - 8 - bw, y: y - 10 - bh + 2, w: bw, h: bh } },
      { x: x + 10, y: y + 22, anchor: "start", box: { x: x + 8, y: y + 10, w: bw, h: bh } },
      { x: x - 10, y: y + 22, anchor: "end", box: { x: x - 8 - bw, y: y + 10, w: bw, h: bh } },
    ];
    const free = cands.find((c) => {
      const b = c.box;
      if (b.x < 2 || b.y < 2 || b.x + b.w > w - 2 || b.y + b.h > h - 2) return false;
      if (placed.some((p) => hit(b, p))) return false;
      return !dots.some(([dx, dy]) => (dx - x) ** 2 + (dy - y) ** 2 > 1 && hit(b, { x: dx - 7, y: dy - 7, w: 14, h: 14 }));
    }) ?? cands[0];
    placed.push(free.box);
    out.set(it.code, { x: free.x, y: free.y, anchor: free.anchor });
  }
  return out;
}

export function RouteMap({ selected, others = [], onSelect }: { selected: Itinerary | null; others?: Itinerary[]; onSelect?: (id: string) => void }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [ref, measured] = useElementWidth<HTMLDivElement>();
  const w = Math.max(measured, 240);
  const h = Math.round(Math.min(Math.max(w * 0.66, 230), 380));

  const segs: Segment[] = useMemo(() => selected?.journeys.flatMap((j) => j.segments) ?? [], [selected]);
  const arcs = useMemo(() => segs.map((s) => ({ s, pts: arcPoints(s.from, s.to, s.mode === "ground" ? 2 : 48, s.mode === "ground" ? 0 : 0.07) })), [segs]);
  const flights = arcs.filter((a) => a.s.mode !== "ground");
  const otherArcs = useMemo(() => others.filter((o) => o.id !== selected?.id).map((o) => ({ o, pts: o.journeys.flatMap((j) => j.segments).filter((s) => s.mode !== "ground").map((s) => arcPoints(s.from, s.to, 20, 0.07)) })), [others, selected]);

  const target = useMemo<Box>(() => {
    const pts = arcs.flatMap((a) => a.pts);
    const aspect = h / w;
    if (!pts.length) return [0, 0, 460, 460 * aspect];
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    // Leave room for labels at the edges; never zoom closer than ~65 map units wide (the New York area).
    const bw = Math.max((x1 - x0) * 1.28, ((y1 - y0) * 1.5) / aspect, 65);
    return [(x0 + x1) / 2 - bw / 2, (y0 + y1) / 2 - (bw * aspect) / 2, bw, bw * aspect];
  }, [arcs, w, h]);
  const box = useCamera(target);
  const k = w / box[2];
  const px = ([x, y]: P): P => [(x - box[0]) * k, (y - box[1]) * k];

  const roles = new Map<string, Role>();
  flights.forEach((a, i) => {
    if (!roles.has(a.s.from)) roles.set(a.s.from, i === 0 ? "origin" : "via");
    roles.set(a.s.to, i === flights.length - 1 ? "dest" : roles.get(a.s.to) ?? "via");
  });
  const metros = new Set([...roles.keys()].map((c) => AIRPORTS[c]?.metro).filter(Boolean));
  const nearby = Object.values(AIRPORTS).filter((a) => metros.has(a.metro) && !roles.has(a.code));
  const stops = [...roles.entries()].map(([code, role]) => ({ code, role, at: px(pt(code)) }));
  const labels = placeLabels(stops, w, h, [...stops.map((s) => s.at), ...nearby.map((a) => px(pt(a.code)))]);
  const planeLines = flights.map((a) => a.pts.map(px));

  const desc = selected
    ? selected.journeys.map((j) => `${j.dir === "out" ? "Outbound" : "Return"}: ${j.segments.map((s) => `${label(s.from)} to ${label(s.to)} by ${MODE_NAME[s.mode].toLowerCase()}`).join(", then ")}.`).join(" ") + ` ${fmtDur(selected.door2doorMin)} door to door. Simplified map, not to scale.`
    : "No itinerary selected.";

  return (
    <figure className="m-0">
      <div ref={ref} className="overflow-hidden rounded-xl border border-line bg-deep" style={{ minHeight: 230 }}>
        {measured > 0 && (
          <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block max-w-full select-none" role="img" aria-labelledby={`t${uid} d${uid}`}>
            <title id={`t${uid}`}>{selected ? `Route map for ${selected.name}` : "Route map"}</title>
            <desc id={`d${uid}`}>{desc}</desc>
            <defs>
              <pattern id={`g${uid}`} width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#263a54" strokeWidth="0.6" opacity="0.5" /></pattern>
              <radialGradient id={`v${uid}`} cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stopColor="#0B1320" stopOpacity="0" /><stop offset="1" stopColor="#0B1320" stopOpacity="0.55" /></radialGradient>
            </defs>
            <rect width={w} height={h} fill={`url(#g${uid})`} />
            <path d={`${pathOf(OUTLINE.map(px))}Z`} fill="#13233a" stroke="#2d4663" strokeWidth="1" strokeLinejoin="round" />

            {otherArcs.map(({ o, pts }) => {
              const d = pts.map((p) => pathOf(p.map(px))).join("");
              return (
                <g key={o.id} onClick={() => onSelect?.(o.id)} className="cursor-pointer" aria-hidden>
                  <path d={d} fill="none" stroke="#8294A8" strokeOpacity="0.3" strokeWidth="1.2" />
                  <path d={d} fill="none" stroke="transparent" strokeWidth="18" strokeLinecap="round" />
                  <title>{`Show ${o.name}`}</title>
                </g>
              );
            })}

            {nearby.map((a) => {
              const [x, y] = px(pt(a.code));
              return <g key={a.code}><circle cx={x} cy={y} r={3.2} fill="none" stroke="#8294A8" strokeWidth="1" /><title>{`${a.code} · ${a.name} (nearby alternative)`}</title></g>;
            })}

            {/* keyed by itinerary so the draw-in replays whenever a different option is selected */}
            <g key={selected?.id ?? "none"}>
              {arcs.map(({ s, pts }, i) => {
                const q = pts.map(px);
                if (Math.hypot(q[0][0] - q[q.length - 1][0], q[0][1] - q[q.length - 1][1]) < 5) return null;
                const d = pathOf(q);
                if (s.mode === "ground") return <path key={s.id + i} d={d} fill="none" stroke={MODE_COLOR.ground} strokeOpacity="0.7" strokeWidth="1.4" strokeDasharray="2 4" strokeLinecap="round" className="fade"><title>{s.label}</title></path>;
                const n = flights.findIndex((f) => f.s === s);
                const delay = `${n * 850}ms`;
                return (
                  <g key={s.id + i}>
                    <path d={d} fill="none" stroke={MODE_COLOR[s.mode]} strokeOpacity="0.14" strokeWidth="8" strokeLinecap="round" className="fade" style={{ animationDelay: delay }} />
                    <path d={d} fill="none" stroke={MODE_COLOR[s.mode]} strokeWidth="2.6" strokeLinecap="round" pathLength={1} className="draw" style={{ ["--draw-d" as string]: "0.9s", ["--draw-delay" as string]: delay }}><title>{s.label}</title></path>
                    {s.mode === "empty_leg" && <path d={d} fill="none" stroke="#0B1320" strokeOpacity="0.55" strokeWidth="1.4" strokeLinecap="round" className="route-flow-in" style={{ animationDelay: `${n * 850 + 900}ms, ${n * 850 + 900}ms` }} />}
                  </g>
                );
              })}
              {stops.map(({ code, role, at: [x, y] }) => {
                const lb = labels.get(code);
                const c = role === "via" ? "#8294A8" : "#D5B779";
                return (
                  <g key={code}>
                    <circle cx={x} cy={y} r={5.5} fill="#0B1320" stroke={c} strokeWidth="2" />
                    <circle cx={x} cy={y} r={2} fill={c} />
                    {lb && <text x={lb.x} y={lb.y} textAnchor={lb.anchor} fontSize="12" fill="#F5F4EF" stroke="#0B1320" strokeWidth="3" paintOrder="stroke" style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{code}</text>}
                  </g>
                );
              })}
              <Plane lines={planeLines} />
            </g>
            <rect width={w} height={h} fill={`url(#v${uid})`} pointerEvents="none" />
          </svg>
        )}
      </div>
      <figcaption className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-steel">
        {(["charter", "empty_leg", "commercial", "ground"] as Mode[]).map((m) => (
          <span key={m} className="inline-flex items-center gap-1.5"><span className="inline-block h-0.5 w-5 rounded" style={{ background: MODE_COLOR[m], opacity: m === "ground" ? 0.8 : 1 }} />{MODE_NAME[m]}</span>
        ))}
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full border border-steel" />Nearby airport</span>
        {selected && <span className="num text-warm sm:ml-auto">{fmtDur(selected.door2doorMin)} door to door · simplified map</span>}
      </figcaption>
    </figure>
  );
}
