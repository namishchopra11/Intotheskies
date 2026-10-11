"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Armchair, BarChart3, Bookmark, Compass, Hourglass, LayoutDashboard, Menu, Settings, ShieldCheck, X } from "lucide-react";
import { useJet, useJetReady } from "@/lib/jetflex/store";
import { Button, cx, Input, Field, useDialogFocus } from "./ui";

export const Mark = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
    <circle cx="16" cy="16" r="14.5" stroke="#D5B779" strokeWidth="1.2" />
    <path d="M7 21.5C11 12 19 8.5 25.5 9.5" stroke="#F5F4EF" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M25.5 9.5l-5.8-.7M25.5 9.5l-3.4 4.9" stroke="#D5B779" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
export const Wordmark = () => (
  <span className="flex items-center gap-2.5">
    <Mark />
    <span className="display text-[1.35rem] font-semibold tracking-[0.14em]">JETFLEX</span>
  </span>
);

const NAV = [
  { href: "/jetflex", label: "Overview", icon: LayoutDashboard, group: "Traveler" },
  { href: "/jetflex/plan", label: "Plan a Trip", icon: Compass, group: "Traveler" },
  { href: "/jetflex/trips", label: "My Trips", icon: Bookmark, group: "Traveler" },
  { href: "/jetflex/cabin", label: "My Cabin", icon: Armchair, group: "Traveler" },
  { href: "/jetflex/timeback", label: "TimeBack", icon: Hourglass, group: "Traveler" },
  { href: "/jetflex/shield", label: "JetShield", icon: ShieldCheck, group: "Traveler" },
  { href: "/jetflex/operator", label: "Operator Intelligence", icon: BarChart3, group: "Operator" },
];

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {["Traveler", "Operator"].map((g) => (
        <div key={g} className="mb-3">
          <p className="mb-1.5 px-3 text-[10px] font-medium uppercase tracking-[0.2em] text-steel/70">{g === "Traveler" ? "JetFlex Traveler" : "JetFlex Intelligence"}</p>
          {NAV.filter((n) => n.group === g).map(({ href, label, icon: Icon }) => {
            const on = href === "/jetflex" ? path === href : path.startsWith(href);
            return (
              <Link key={href} href={href} onClick={onNavigate} aria-current={on ? "page" : undefined}
                className={cx("flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors", on ? "bg-panel-2 text-warm shadow-[inset_2px_0_0_0_#D5B779]" : "text-steel hover:bg-panel hover:text-warm")}>
                <Icon size={17} strokeWidth={1.6} className={on ? "text-gold" : ""} aria-hidden />
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function SettingsDialog({ onClose }: { onClose: () => void }) {
  const cabin = useJet((s) => s.cabin);
  const setCabin = useJet((s) => s.setCabin);
  const reset = useJet((s) => s.resetDemo);
  const [done, setDone] = useState(false);
  const panel = useDialogFocus(onClose);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-midnight/80 p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal aria-label="Profile and settings" onClick={onClose}>
      <div ref={panel} tabIndex={-1} className="rise max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-panel p-5 outline-none sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="display text-2xl">Profile & settings</h2>
          <button onClick={onClose} aria-label="Close" className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-steel hover:text-warm"><X size={18} /></button>
        </div>
        <Field label="Traveler name" hint="Used on cabin service briefs. Stored only in this browser.">
          {(id) => <Input id={id} value={cabin.name} onChange={(e) => setCabin({ ...cabin, name: e.target.value })} placeholder="e.g. Alex Morgan" />}
        </Field>
        <div className="mt-6 rounded-xl border border-line bg-deep p-4 text-sm text-steel">
          <p className="mb-3">JetFlex runs entirely on simulated data in your browser. No account, backend or payment is involved.</p>
          <Button variant="danger" size="sm" onClick={() => { reset(); setDone(true); }}>Reset demo data</Button>
          {done && <p className="mt-2 text-xs text-ok">Search, selection, operator edits and added flights were reset. Saved trips and cabin profile are kept.</p>}
        </div>
        <p className="mt-4 text-xs text-steel">Looking for ConnectionKeeper? <Link className="text-gold underline" href="/">Open it here</Link>.</p>
      </div>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const ready = useJetReady();
  const name = useJet((s) => s.cabin.name);
  const initial = (ready && name.trim()[0]) || "G";
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between border-r border-line bg-deep px-4 py-6 lg:flex">
        <div>
          <Link href="/jetflex" className="mb-8 block px-3" aria-label="JetFlex home"><Wordmark /></Link>
          <Nav />
        </div>
        <div className="space-y-3">
          <p className="rounded-xl border border-warn/30 bg-warn/5 px-3 py-2 text-[11px] leading-snug text-warn">Demo inventory is simulated. Nothing here is bookable or real-time.</p>
          <button onClick={() => setSettings(true)} className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left hover:bg-panel">
            <span className="display flex h-8 w-8 items-center justify-center rounded-full bg-gold/15 text-gold">{initial.toUpperCase()}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-sm">{ready && name ? name : "Guest traveler"}</span><span className="block text-xs text-steel">Profile & settings</span></span>
            <Settings size={15} className="text-steel" aria-hidden />
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="sticky top-0 z-40 border-b border-line bg-midnight/90 backdrop-blur lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/jetflex" aria-label="JetFlex home" className="flex min-h-11 items-center"><Wordmark /></Link>
            <button aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)} className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-warm">{open ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
          {open && (
            <div className="rise max-h-[80dvh] overflow-y-auto border-t border-line bg-deep px-3 py-4">
              <Nav onNavigate={() => setOpen(false)} />
              <Button className="mt-2 w-full" onClick={() => { setSettings(true); setOpen(false); }}><Settings size={15} /> Profile & settings</Button>
            </div>
          )}
        </div>
        <main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-10">{children}</main>
        <footer className="mx-auto w-full max-w-[1240px] px-4 pb-8 text-xs leading-snug text-steel sm:px-8 lg:hidden">Demo inventory is simulated. Nothing here is bookable or real-time.</footer>
      </div>
      {settings && <SettingsDialog onClose={() => setSettings(false)} />}
    </div>
  );
}
