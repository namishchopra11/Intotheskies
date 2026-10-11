"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStoreReady, useTripStore } from "@/lib/store";
import { useTour } from "@/lib/tour";
import { Button } from "./Button";
import { BrandMark } from "./Brand";
import { Icon } from "./Icon";

const STEPS = [
  { route: "/", target: "home", title: "Your home base", body: "Tap the Layover logo anytime to return to your trip overview." },
  { route: "/", target: "menu", title: "Everything for your trip", body: "This menu opens your bookings, saved trips and sharing options. Start here when you need to change your plans." },
  { route: "/", target: "profile", title: "Your account & settings", body: "Tap your initials to manage your account, change time formats or choose a listening voice." },
  { route: "/trip", target: "import", title: "Bring your bookings in", body: "Add a confirmation here. Choose a file, drag it in, paste an email or photograph your boarding pass. You review details before adding them." },
  { route: "/trip", target: "bookings", title: "Or add it yourself", body: "Start with a trip name, then add flights, hotels and rides. Already have a trip? This button adds another flight." },
  { route: "/settings", target: "appearance", title: "Make it yours", body: "Choose Light, Dark or Auto here. You can replay this tour from Settings whenever you need a reminder." },
] as const;

type Box = { x: number; y: number; width: number; height: number; viewportWidth: number; viewportHeight: number; cardHeight: number };

/** Six real controls, highlighted without changing the traveler's trip. */
export function AccountTour() {
  const storeReady = useStoreReady();
  const { active, step, go, finish } = useTour();
  const profile = useTripStore((s) => s.profile);
  const pathname = usePathname();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const current = STEPS[step];
  const showing = active && Boolean(profile) && pathname === current.route;

  useEffect(() => {
    // The account check survives a full reload or a missed login-screen signal.
    if (storeReady && profile && !profile.guest && pathname === "/" && !active) {
      useTour.getState().start(profile);
    }
  }, [storeReady, profile, pathname, active]);

  useEffect(() => {
    if (active && profile && pathname !== current.route) router.push(current.route);
  }, [active, profile, pathname, current.route, router]);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (!active || !profile) { if (d.open) d.close(); return; }
    if (!d.open) d.showModal();
    nextButton.current?.focus();
    return () => { if (d.open) d.close(); };
  }, [active, profile]);

  useEffect(() => {
    if (!active) return;
    const frame = requestAnimationFrame(() => nextButton.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [active, step]);

  useEffect(() => {
    if (!showing) return;
    let frame = 0;
    let tries = 0;
    let scrolled = false;
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const target = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${current.target}"]`))
        .find((el) => el.getClientRects().length > 0);
      if (!target) {
        setBox(null);
        if (tries++ < 120) frame = requestAnimationFrame(measure);
        return;
      }
      if (!scrolled) { target.scrollIntoView({ block: "start", behavior: "instant" }); scrolled = true; }
      const r = target.getBoundingClientRect();
      setBox({ x: r.left, y: r.top, width: r.width, height: r.height, viewportWidth: window.innerWidth, viewportHeight: window.innerHeight, cardHeight: card.current?.getBoundingClientRect().height ?? 260 });
      // Follow entrance animations until the highlighted control settles.
      if (tries++ < 30) frame = requestAnimationFrame(measure);
    };
    frame = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [showing, current.target]);

  const close = () => { finish(); router.push("/"); };
  const width = box ? Math.min(360, box.viewportWidth - 32) : 320;
  const left = box ? Math.max(16, Math.min(box.x + box.width / 2 - width / 2, box.viewportWidth - width - 16)) : 16;
  const below = box ? box.y + box.height + 16 + box.cardHeight <= box.viewportHeight - 16 : true;
  const top = box ? Math.max(16, below ? box.y + box.height + 16 : box.y - box.cardHeight - 16) : 80;
  const arrowLeft = box ? Math.max(20, Math.min(width - 28, box.x + box.width / 2 - left - 6)) : 24;

  return (
    <dialog ref={dialog} aria-labelledby="account-tour-title" aria-describedby="account-tour-copy"
      onCancel={(e) => { e.preventDefault(); close(); }}
      className="ck-account-tour fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-ink">
      {box ? <div aria-hidden="true" className="ck-tour-spotlight pointer-events-none fixed top-0 left-0 rounded-[14px] border-2 border-signal"
        style={{ transform: `translate(${box.x - 5}px, ${box.y - 5}px)`, width: box.width + 10, height: box.height + 10, boxShadow: "0 0 0 9999px rgba(0,0,0,0.52), 0 0 0 4px color-mix(in srgb, var(--signal) 18%, transparent)" }} />
        : <div className="fixed inset-0 bg-black/55" />}
      <section ref={card} className="ck-tour-card fixed rounded-card border border-line bg-surface p-5 shadow-[0_16px_48px_rgba(0,0,0,0.2)]" style={{ left, top, width }}>
        {box && <span aria-hidden="true" className="absolute h-3 w-3 rotate-45 border-line bg-surface transition-[left] duration-300" style={{ left: arrowLeft, ...(below ? { top: -7, borderTopWidth: 1, borderLeftWidth: 1 } : { bottom: -7, borderBottomWidth: 1, borderRightWidth: 1 }) }} />}
        <div className="relative mb-4 flex items-center justify-between border-b border-dashed border-line pb-3">
          <span className="flex items-center gap-2 text-[13px] font-semibold"><BrandMark size={24} className="rounded-[5px]" />Layover guide</span>
          <button type="button" onClick={close} className="min-h-9 rounded-control px-2 text-[13px] text-ink-2 transition-colors hover:bg-sunk hover:text-ink">Skip</button>
        </div>
        <div key={step} className="ck-tour-copy">
          <span className="mb-3 inline-flex items-center gap-2 rounded-[5px] bg-signal px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-on-signal">
            <Icon name="plane" size={13} /><span className="font-num">STEP {String(step + 1).padStart(2, "0")} / 06</span>
          </span>
          <h2 id="account-tour-title" className="text-[20px] leading-tight font-semibold tracking-[-0.02em]">{current.title}</h2>
          <p id="account-tour-copy" className="mt-2 text-[14px] leading-[1.5] text-ink-2">{current.body}</p>
        </div>
        <div className="mt-5 flex gap-1.5" aria-hidden="true">
          {STEPS.map((_, i) => <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-line"><span className="block h-full origin-left rounded-full bg-signal transition-transform duration-300 ease-out motion-reduce:transition-none" style={{ transform: `scaleX(${i <= step ? 1 : 0})` }} /></span>)}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" disabled={step === 0} onClick={() => go(step - 1)} className="inline-flex min-h-11 items-center gap-1 rounded-control px-2 text-[14px] font-semibold transition-colors hover:bg-sunk disabled:invisible"><Icon name="chevron-left" size={16} />Back</button>
          <Button variant="primary" size="sm" chip={step === 5 ? "check" : "arrow-right"} onClick={() => step === 5 ? close() : go(step + 1)}>
            <span ref={(node) => { nextButton.current = node?.closest("button") ?? null; }}>{step === 5 ? "Let's go" : "Next"}</span>
          </Button>
        </div>
      </section>
    </dialog>
  );
}
