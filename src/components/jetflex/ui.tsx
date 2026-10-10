"use client";
import { forwardRef, useId, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { Info } from "lucide-react";

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

export const Card = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => <div className={cx("rounded-2xl border border-line bg-panel/70", className)} {...p} />;

const VARIANT = {
  primary: "bg-gold text-midnight hover:bg-[#e2c78d] font-semibold shadow-[0_0_0_1px_rgb(213_183_121/0.4)]",
  ghost: "border border-line text-warm hover:border-steel hover:bg-panel-2",
  subtle: "bg-panel-2 text-warm hover:bg-[#233853]",
  danger: "border border-bad/40 text-bad hover:bg-bad/10",
};
export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANT; size?: "sm" | "md" }>(
  ({ variant = "ghost", size = "md", className, ...p }, ref) => (
    <button ref={ref} className={cx("inline-flex items-center justify-center gap-2 rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-40", size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2.5 text-sm", VARIANT[variant], className)} {...p} />
  ),
);
Button.displayName = "Button";

const TONE = { gold: "border-gold/40 bg-gold/10 text-gold", teal: "border-teal/40 bg-teal/10 text-teal", ok: "border-ok/40 bg-ok/10 text-ok", warn: "border-warn/40 bg-warn/10 text-warn", bad: "border-bad/40 bg-bad/10 text-bad", steel: "border-steel/30 bg-steel/10 text-steel" };
export const Badge = ({ tone = "steel", children, className }: { tone?: keyof typeof TONE; children: ReactNode; className?: string }) => (
  <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide", TONE[tone], className)}>{children}</span>
);

export const SimBadge = ({ children = "Simulated" }: { children?: ReactNode }) => <Badge tone="warn"><Info size={11} aria-hidden />{children}</Badge>;

export function Field({ label, hint, children, className }: { label: string; hint?: ReactNode; children: (id: string) => ReactNode; className?: string }) {
  const id = useId();
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-xs font-medium uppercase tracking-[0.08em] text-steel">{label}</label>
      {children(id)}
      {hint && <p className="text-xs text-steel">{hint}</p>}
    </div>
  );
}
const INPUT = "w-full rounded-xl border border-line bg-deep px-3 py-2.5 text-sm text-warm placeholder:text-steel/70 focus:border-gold focus:outline-none";
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => <input ref={ref} className={cx(INPUT, className)} {...p} />);
Input.displayName = "Input";
export const Select = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select className={cx(INPUT, "appearance-none bg-[length:12px] pr-8", className)} {...p} />;

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 rounded-xl border border-line bg-deep p-1">
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}
          className={cx("flex-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs transition-colors", o.value === value ? "bg-gold font-semibold text-midnight" : "text-steel hover:text-warm")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
    className={cx("relative h-6 w-11 shrink-0 rounded-full border transition-colors", checked ? "border-gold bg-gold/80" : "border-line bg-deep")}>
    <span className={cx("absolute top-0.5 h-4 w-4 rounded-full bg-warm transition-all", checked ? "left-6 bg-midnight" : "left-1")} />
  </button>
);

export const PageHeader = ({ eyebrow, title, children, action }: { eyebrow: string; title: ReactNode; children?: ReactNode; action?: ReactNode }) => (
  <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
    <div className="max-w-2xl">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-gold">{eyebrow}</p>
      <h1 className="display text-3xl leading-[1.05] sm:text-4xl md:text-[2.7rem]">{title}</h1>
      {children && <p className="mt-3 text-[15px] leading-relaxed text-steel">{children}</p>}
    </div>
    {action}
  </header>
);

export const EmptyState = ({ title, children, action, icon }: { title: string; children: ReactNode; action?: ReactNode; icon?: ReactNode }) => (
  <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-12 text-center">
    {icon && <div className="text-steel">{icon}</div>}
    <h3 className="display text-xl">{title}</h3>
    <p className="max-w-md text-sm text-steel">{children}</p>
    {action}
  </div>
);

export const Notice = ({ tone = "warn", children }: { tone?: "warn" | "bad" | "ok" | "steel"; children: ReactNode }) => (
  <div role={tone === "bad" ? "alert" : "status"} className={cx("flex gap-2 rounded-xl border px-3.5 py-2.5 text-sm", TONE[tone])}>{children}</div>
);

export const Stat = ({ label, value, note }: { label: string; value: ReactNode; note: string }) => (
  <div>
    <p className="text-xs uppercase tracking-[0.1em] text-steel">{label}</p>
    <p className="num mt-1 text-2xl text-warm">{value}</p>
    <p className="mt-1 text-xs leading-snug text-steel">{note}</p>
  </div>
);

export const Skeleton = ({ className }: { className?: string }) => <div className={cx("skeleton rounded-xl", className)} aria-hidden />;
