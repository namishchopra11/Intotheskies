"use client";
import { forwardRef, useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type ButtonHTMLAttributes, type ComponentProps, type CSSProperties, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import Link from "next/link";
import { Info } from "lucide-react";

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

/** Stagger helper: `style={stagger(i)}` on an element with the `rise` class delays it by i * 70ms. */
export const stagger = (i: number, max = 10): CSSProperties => ({ ["--i" as string]: Math.min(i, max) });

/* ------------------------------------------------------------------ hooks */

/** Live `matchMedia` result. False on the server and during hydration, then corrects itself. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

export const useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");

/** Callback-ref + live width of the element (px). 0 until it is measured. */
export function useElementWidth<T extends HTMLElement | SVGElement = HTMLDivElement>(): [(el: T | null) => void, number] {
  const [w, setW] = useState(0);
  const ro = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: T | null) => {
    ro.current?.disconnect();
    ro.current = null;
    if (!el) return;
    setW(el instanceof HTMLElement ? el.clientWidth : Math.round(el.getBoundingClientRect().width));
    ro.current = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.current.observe(el);
  }, []);
  return [ref, w];
}

/* ------------------------------------------------------------- primitives */

export const Card = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => <div className={cx("rounded-2xl border border-line bg-panel/70", className)} {...p} />;

const VARIANT = {
  primary: "bg-gold text-midnight hover:bg-[#e2c78d] font-semibold shadow-[0_0_0_1px_rgb(213_183_121/0.4)]",
  ghost: "border border-line text-warm hover:border-steel hover:bg-panel-2",
  subtle: "bg-panel-2 text-warm hover:bg-[#233853]",
  danger: "border border-bad/40 text-bad hover:bg-bad/10",
};
type ButtonLook = { variant?: keyof typeof VARIANT; size?: "sm" | "md" };
// 44px minimum height on touch-width screens; compact from sm up.
const buttonClass = ({ variant = "ghost", size = "md" }: ButtonLook, className?: string) =>
  cx("inline-flex min-h-11 items-center justify-center gap-2 rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-40", size === "sm" ? "px-3 py-1.5 text-sm sm:min-h-9" : "px-4 py-2.5 text-sm sm:min-h-0", VARIANT[variant], className);

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & ButtonLook>(
  ({ variant, size, className, ...p }, ref) => <button ref={ref} className={buttonClass({ variant, size }, className)} {...p} />,
);
Button.displayName = "Button";

/** A real link that looks like a Button (no button nested in an anchor, one tab stop). */
export const LinkButton = ({ href, variant, size, className, children, ...p }: { href: string; className?: string; children: ReactNode } & ButtonLook & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) => (
  <Link href={href} className={buttonClass({ variant, size }, className)} {...p}>{children}</Link>
);

const TONE = { gold: "border-gold/40 bg-gold/10 text-gold", teal: "border-teal/40 bg-teal/10 text-teal", ok: "border-ok/40 bg-ok/10 text-ok", warn: "border-warn/40 bg-warn/10 text-warn", bad: "border-bad/40 bg-bad/10 text-bad", steel: "border-steel/30 bg-steel/10 text-steel" };
export const Badge = ({ tone = "steel", children, className }: { tone?: keyof typeof TONE; children: ReactNode; className?: string }) => (
  <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide", TONE[tone], className)}>{children}</span>
);

export const SimBadge = ({ children = "Simulated" }: { children?: ReactNode }) => <Badge tone="warn"><Info size={11} aria-hidden />{children}</Badge>;

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: (id: string) => ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-xs font-medium uppercase tracking-[0.08em] text-steel">{label}</label>
      {children(id)}
      {hint && <p className="text-xs text-steel">{hint}</p>}
    </div>
  );
}
// 16px on phones so iOS does not zoom the page on focus, and a 44px tall hit area.
const INPUT = "block min-h-11 w-full min-w-0 rounded-xl border border-line bg-deep px-3 py-2.5 text-base text-warm placeholder:text-steel/70 focus:border-gold focus:outline-none sm:min-h-0 sm:text-sm";
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => <input ref={ref} className={cx(INPUT, className)} {...p} />);
Input.displayName = "Input";
export const Select = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select className={cx(INPUT, "appearance-none bg-[length:12px] pr-8", className)} {...p} />;

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-xl border border-line bg-deep p-1">
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}
          className={cx("min-h-11 flex-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs transition-colors sm:min-h-0", o.value === value ? "bg-gold font-semibold text-midnight" : "text-steel hover:text-warm")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  // The visible track is 44x24; the pseudo-element grows the touch area to 44x44.
  <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
    className={cx("relative h-6 w-11 shrink-0 rounded-full border transition-colors after:absolute after:-inset-x-0 after:-inset-y-2.5 after:content-['']", checked ? "border-gold bg-gold/80" : "border-line bg-deep")}>
    <span className={cx("absolute top-0.5 h-4 w-4 rounded-full bg-warm transition-all", checked ? "left-6 bg-midnight" : "left-1")} />
  </button>
);

export const PageHeader = ({ eyebrow, title, children, action }: { eyebrow: string; title: ReactNode; children?: ReactNode; action?: ReactNode }) => (
  <header className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
    <div className="max-w-2xl">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-gold">{eyebrow}</p>
      <h1 className="display text-[1.75rem] leading-[1.08] sm:text-4xl md:text-[2.7rem]">{title}</h1>
      {children && <p className="mt-3 text-[15px] leading-relaxed text-steel">{children}</p>}
    </div>
    {action}
  </header>
);

export const EmptyState = ({ title, children, action, icon, className }: { title: string; children: ReactNode; action?: ReactNode; icon?: ReactNode; className?: string }) => (
  <div className={cx("flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-5 py-10 text-center sm:px-6 sm:py-12", className)}>
    {icon && <div className="text-steel">{icon}</div>}
    <h3 className="display text-xl">{title}</h3>
    <p className="max-w-md text-sm text-steel">{children}</p>
    {action && <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div>}
  </div>
);

/** A problem the traveller can fix: says what went wrong, what to try next, and offers actions. */
export const ErrorState = ({ title, children, action, icon }: { title: string; children: ReactNode; action?: ReactNode; icon?: ReactNode }) => (
  <div role="alert" className="rise flex gap-3 rounded-2xl border border-bad/40 bg-[color-mix(in_srgb,var(--color-bad)_8%,var(--color-deep))] p-4 sm:p-5">
    {icon && <div className="mt-0.5 shrink-0 text-bad">{icon}</div>}
    <div className="min-w-0">
      <h3 className="display text-lg leading-snug">{title}</h3>
      <div className="mt-1 text-sm leading-relaxed text-steel">{children}</div>
      {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
    </div>
  </div>
);

export const Notice = ({ tone = "warn", children }: { tone?: "warn" | "bad" | "ok" | "steel"; children: ReactNode }) => (
  <div role={tone === "bad" ? "alert" : "status"} className={cx("flex gap-2 rounded-xl border px-3.5 py-2.5 text-sm", TONE[tone])}>{children}</div>
);

export const Stat = ({ label, value, note }: { label: string; value: ReactNode; note: string }) => (
  <div className="min-w-0">
    <p className="text-xs uppercase tracking-[0.1em] text-steel">{label}</p>
    <p className="num mt-1 text-2xl text-warm">{value}</p>
    <p className="mt-1 text-xs leading-snug text-steel">{note}</p>
  </div>
);

export const Skeleton = ({ className }: { className?: string }) => <div className={cx("skeleton rounded-xl", className)} aria-hidden />;

/* ----------------------------------------------------------------- motion */

/**
 * Number that counts up (or down) to `value`. The animated text is hidden from assistive tech;
 * a static copy of the final value is exposed instead so live regions are not flooded.
 * With prefers-reduced-motion it simply shows the value.
 */
export function CountUp({ value, format = (n: number) => String(Math.round(n)), duration = 750, className }: { value: number; format?: (n: number) => string; duration?: number; className?: string }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);
  const cur = useRef(0);
  useEffect(() => {
    if (reduced) {
      cur.current = value;
      return;
    }
    const [a, b] = [cur.current, value];
    if (a === b) return;
    let raf = 0;
    let t0: number | null = null;
    const step = (now: number) => {
      t0 ??= now;
      const t = Math.min(1, (now - t0) / duration);
      const v = a + (b - a) * (1 - Math.pow(1 - t, 3));
      cur.current = v;
      setShown(v);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced, duration]);
  return (
    <span className={className}>
      <span aria-hidden>{format(reduced ? value : shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
