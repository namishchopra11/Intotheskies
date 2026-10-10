"use client";
import Image from "next/image";
import { useCallback, useId, useState } from "react";
import credits from "../../../public/jetflex/photos/credits.json";

/**
 * A photo slot. Renders /jetflex/photos/<file> through next/image when the manifest
 * (public/jetflex/photos/credits.json) says the file has been added, and a built-in
 * illustration otherwise, so the page looks finished with zero photos. The illustration sits
 * underneath and the photo fades in on load, so there is never a broken-image flash.
 */

export type PhotoId = "jet-apron" | "cabin-interior" | "runway-dusk" | "miami-skyline";
export type PhotoEntry = {
  file: string;
  title: string;
  alt: string;
  where: string;
  focal?: string;
  added: boolean;
  status: string;
  photographer: string | null;
  sourceUrl: string | null;
  licence: string | null;
};
export const PHOTOS = credits.photos as unknown as Record<PhotoId, PhotoEntry>;

const join = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

/* A tiny deterministic generator so the skyline looks hand-placed but is stable across renders. */
const lcg = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const SKYLINE = (() => {
  const r = lcg(7);
  const out: { x: number; w: number; h: number; lit: number }[] = [];
  for (let x = 40; x < 1580; ) {
    const w = 40 + r() * 70;
    const tall = r() > 0.78;
    out.push({ x, w, h: (tall ? 260 : 90) + r() * (tall ? 200 : 130), lit: r() });
    x += w + 6 + r() * 14;
  }
  return out;
})();

function Scene({ id }: { id: PhotoId }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const g = (n: string) => `${n}${uid}`;
  const common = { viewBox: "0 0 1600 900", preserveAspectRatio: "xMidYMid slice", "aria-hidden": true as const, className: "absolute inset-0 h-full w-full" };

  if (id === "jet-apron")
    return (
      <svg {...common}>
        <defs>
          <linearGradient id={g("sky")} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#0b1320" /><stop offset="0.45" stopColor="#1d2b45" /><stop offset="0.7" stopColor="#6c5a63" /><stop offset="0.8" stopColor="#d9a66b" /></linearGradient>
          <linearGradient id={g("ground")} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#1a2436" /><stop offset="1" stopColor="#0b1320" /></linearGradient>
          <linearGradient id={g("body")} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#f5f4ef" /><stop offset="1" stopColor="#aab6c4" /></linearGradient>
          <radialGradient id={g("glow")} cx="0.7" cy="0.8" r="0.6"><stop offset="0" stopColor="#f2c38a" stopOpacity="0.55" /><stop offset="1" stopColor="#f2c38a" stopOpacity="0" /></radialGradient>
        </defs>
        <rect width="1600" height="900" fill={`url(#${g("sky")})`} />
        <rect width="1600" height="900" fill={`url(#${g("glow")})`} />
        {[[180, 90], [420, 160], [760, 70], [1010, 130], [1330, 60], [1500, 190], [560, 230]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.6} fill="#f5f4ef" opacity={0.5} />)}
        <rect y="640" width="1600" height="260" fill={`url(#${g("ground")})`} />
        <path d="M0 640 H1600" stroke="#d9a66b" strokeOpacity="0.35" />
        {[0, 1, 2, 3].map((i) => <path key={i} d={`M ${-200 + i * 520} 900 L ${780 + i * 120} 645`} stroke="#d5b779" strokeOpacity="0.18" strokeWidth="3" />)}
        <ellipse cx="1180" cy="640" rx="360" ry="22" fill="#000" opacity="0.4" />
        <g>
          <path d="M920 560 L1000 540 L1360 536 C1430 536 1480 560 1500 582 C1480 598 1430 614 1360 616 L1000 612 Z" fill={`url(#${g("body")})`} />
          <path d="M930 556 L890 430 L940 430 L1040 540 Z" fill={`url(#${g("body")})`} />
          <path d="M885 432 L965 424 L965 436 L893 444 Z" fill="#8294a8" />
          <path d="M906 484 L930 480" stroke="#d5b779" strokeWidth="6" />
          <rect x="990" y="516" width="130" height="38" rx="19" fill="#8294a8" />
          <path d="M1190 604 L1070 700 L1112 702 L1296 610 Z" fill="#8294a8" />
          <path d="M1000 584 H1480" stroke="#d5b779" strokeWidth="4" opacity="0.9" />
          {Array.from({ length: 9 }).map((_, i) => <rect key={i} x={1120 + i * 34} y={558} width="14" height="20" rx="6" fill="#f2c38a" opacity="0.9" />)}
          <path d="M1420 560 L1470 568 L1444 580 Z" fill="#1d2b45" />
        </g>
      </svg>
    );

  if (id === "cabin-interior")
    return (
      <svg {...common}>
        <defs>
          <linearGradient id={g("wall")} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#0e1828" /><stop offset="1" stopColor="#1b2d46" /></linearGradient>
          <linearGradient id={g("win")} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#4b5f82" /><stop offset="1" stopColor="#f2c38a" /></linearGradient>
          <linearGradient id={g("floor")} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#152337" /><stop offset="1" stopColor="#0b1320" /></linearGradient>
          <radialGradient id={g("lamp")} cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#f2c38a" stopOpacity="0.5" /><stop offset="1" stopColor="#f2c38a" stopOpacity="0" /></radialGradient>
        </defs>
        <rect width="1600" height="900" fill={`url(#${g("wall")})`} />
        <rect y="660" width="1600" height="240" fill={`url(#${g("floor")})`} />
        <path d="M0 80 H1600" stroke="#d5b779" strokeOpacity="0.55" strokeWidth="4" />
        <path d="M0 660 H1600" stroke="#263a54" strokeWidth="3" />
        {[330, 800, 1270].map((x) => (
          <g key={x}>
            <rect x={x - 90} y={150} width="180" height="260" rx="90" fill="#0b1320" stroke="#263a54" strokeWidth="14" />
            <rect x={x - 76} y={164} width="152" height="232" rx="76" fill={`url(#${g("win")})`} />
          </g>
        ))}
        <circle cx="800" cy="560" r="260" fill={`url(#${g("lamp")})`} />
        {[{ x: 260, flip: 1 }, { x: 1340, flip: -1 }].map(({ x, flip }) => (
          <g key={x} transform={`translate(${x} 0) scale(${flip} 1)`}>
            <rect x="-120" y="400" width="240" height="250" rx="50" fill="#1b2d46" stroke="#2d4663" strokeWidth="3" />
            <rect x="-150" y="600" width="300" height="100" rx="34" fill="#24395a" stroke="#2d4663" strokeWidth="3" />
            <rect x="130" y="560" width="46" height="150" rx="20" fill="#1b2d46" stroke="#2d4663" strokeWidth="3" />
            <path d="M-80 440 H80" stroke="#d5b779" strokeOpacity="0.5" strokeDasharray="5 7" />
          </g>
        ))}
        <rect x="660" y="600" width="280" height="20" rx="10" fill="#2d4663" />
        <rect x="788" y="620" width="24" height="90" fill="#263a54" />
        <ellipse cx="800" cy="716" rx="70" ry="10" fill="#0b1320" />
        <rect x="740" y="586" width="36" height="14" rx="4" fill="#f5f4ef" opacity="0.75" />
        <rect x="830" y="580" width="14" height="22" rx="6" fill="#d5b779" opacity="0.8" />
      </svg>
    );

  if (id === "runway-dusk")
    return (
      <svg {...common}>
        <defs>
          <linearGradient id={g("sky")} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#141a33" /><stop offset="0.5" stopColor="#4a3b5c" /><stop offset="0.78" stopColor="#d9805f" /><stop offset="1" stopColor="#f2c38a" /></linearGradient>
          <linearGradient id={g("rw")} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#1a2436" /><stop offset="1" stopColor="#0b1320" /></linearGradient>
          <radialGradient id={g("sun")} cx="0.5" cy="0.58" r="0.35"><stop offset="0" stopColor="#ffe3b0" stopOpacity="0.9" /><stop offset="1" stopColor="#ffe3b0" stopOpacity="0" /></radialGradient>
        </defs>
        <rect width="1600" height="900" fill={`url(#${g("sky")})`} />
        <rect width="1600" height="900" fill={`url(#${g("sun")})`} />
        <rect y="520" width="1600" height="380" fill="#0b1320" />
        <path d="M0 520 C 300 500, 500 530, 800 515 S 1300 500, 1600 520 V 540 H0 Z" fill="#0e1828" />
        <path d="M470 900 L770 526 L830 526 L1130 900 Z" fill={`url(#${g("rw")})`} />
        {Array.from({ length: 9 }).map((_, i) => {
          const t = i / 8;
          const y = 540 + Math.pow(t, 1.9) * 350;
          const half = 28 + (1130 - 800) * Math.pow(t, 1.9) + 4;
          return (
            <g key={i}>
              <circle cx={800 - half} cy={y} r={2 + t * 6} fill="#f2c38a" />
              <circle cx={800 + half} cy={y} r={2 + t * 6} fill="#f2c38a" />
              <rect x={797 - t * 7} y={y} width={6 + t * 14} height={4 + t * 34} rx="2" fill="#f5f4ef" opacity="0.7" />
            </g>
          );
        })}
      </svg>
    );

  return (
    <svg {...common}>
      <defs>
        <linearGradient id={g("sky")} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#1b2d46" /><stop offset="0.5" stopColor="#7a5c78" /><stop offset="0.75" stopColor="#e9906a" /><stop offset="1" stopColor="#f2c38a" /></linearGradient>
        <linearGradient id={g("water")} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2a3550" /><stop offset="1" stopColor="#0b1320" /></linearGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${g("sky")})`} />
      <circle cx="1130" cy="520" r="90" fill="#ffe3b0" opacity="0.85" />
      <rect y="560" width="1600" height="340" fill={`url(#${g("water")})`} />
      {SKYLINE.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={560 - b.h} width={b.w} height={b.h} fill="#101a2c" />
          {Array.from({ length: Math.floor(b.h / 26) }).map((_, r) => (
            (r * 7 + i * 3) % 4 === 0 ? <rect key={r} x={b.x + 8} y={560 - b.h + 10 + r * 26} width={b.w - 16} height="5" fill="#f2c38a" opacity={0.25 + b.lit * 0.45} /> : null
          ))}
          <rect x={b.x} y={562} width={b.w} height={b.h * 0.35} fill="#101a2c" opacity="0.35" />
        </g>
      ))}
      <path d="M0 568 H1600" stroke="#f2c38a" strokeOpacity="0.4" />
    </svg>
  );
}

export function Photo({ id, className, sizes = "100vw", priority, credit = "overlay" }: { id: PhotoId; className?: string; sizes?: string; priority?: boolean; credit?: "overlay" | "below" | "none" }) {
  const e = PHOTOS[id];
  const [state, setState] = useState<"loading" | "loaded" | "failed">("loading");
  const wanted = e.added && state !== "failed";
  // Load or error events that fire before hydration are lost, so also check the element when it mounts.
  const imgRef = useCallback((el: HTMLImageElement | null) => { if (el?.complete) setState(el.naturalWidth > 0 ? "loaded" : "failed"); }, []);
  const live = wanted && state === "loaded";
  const line = live && (e.photographer || e.licence) ? (
    <>
      Photo{e.photographer ? <> by {e.sourceUrl ? <a href={e.sourceUrl} target="_blank" rel="noreferrer noopener" className="underline underline-offset-2 hover:text-warm">{e.photographer}</a> : e.photographer}</> : null}{e.licence ? <> · {e.licence}</> : null}
    </>
  ) : null;

  return (
    <figure className={join("m-0 overflow-hidden", !className?.includes("absolute") && "relative", className)} data-photo={id} data-photo-live={live ? "true" : "false"}>
      <div className="absolute inset-0" role={live ? "img" : undefined} aria-label={live ? e.alt : undefined}>
        <Scene id={id} />
        {wanted && (
          <Image ref={imgRef} src={`/jetflex/photos/${e.file}`} alt={e.alt} fill sizes={sizes} priority={priority} quality={80}
            onLoad={() => setState("loaded")} onError={() => setState("failed")}
            className={join("object-cover transition-opacity duration-500", live ? "opacity-100" : "opacity-0")} style={{ objectPosition: e.focal }} />
        )}
      </div>
      {line && credit === "overlay" && <figcaption className="pointer-events-auto absolute bottom-1.5 right-2 z-[2] max-w-[80%] truncate rounded bg-midnight/60 px-1.5 py-0.5 text-[10px] text-warm/80">{line}</figcaption>}
      {line && credit === "below" && <figcaption className="absolute inset-x-0 bottom-0 bg-midnight/70 px-3 py-1 text-[10px] text-warm/80">{line}</figcaption>}
    </figure>
  );
}
