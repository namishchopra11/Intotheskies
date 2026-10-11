"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

const THRESHOLD = 52;
const SETTLE = "240ms cubic-bezier(0.22, 1, 0.36, 1)";

// Keep moving without a hard limit, while each extra pixel takes more effort.
const resistedDistance = (pixels: number) => 80 * Math.log1p(Math.max(0, pixels) / 200);

/** Refresh from the top with touch, a mouse drag, or an upward trackpad scroll. */
export function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [distance, setDistance] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [spinStart, setSpinStart] = useState(0);
  const [readyToSettle, setReadyToSettle] = useState(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!refreshing || !readyToSettle || pending) return;
    // Finish the return animation before accepting another gesture.
    const settle = window.setTimeout(() => setDistance(0), 0);
    const finish = window.setTimeout(() => {
      setRefreshing(false);
      setReadyToSettle(false);
      refreshingRef.current = false;
    }, 280);
    return () => {
      window.clearTimeout(settle);
      window.clearTimeout(finish);
    };
  }, [refreshing, readyToSettle, pending]);

  useEffect(() => {
    let origin: { x: number; y: number } | null = null;
    let pull = 0;
    let wheelTravel = 0;
    let dragging = false;
    let frame = 0;
    let settleTimer = 0;
    let wheelTimer = 0;
    let mouseDown = false;
    const reset = () => {
      origin = null;
      dragging = false;
      pull = 0;
      wheelTravel = 0;
      setPulling(false);
      setDistance(0);
    };
    const canStart = (event: Event) => {
      if (refreshingRef.current || window.scrollY > 0 || document.querySelector("dialog[open]")) return false;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select, button, a, [contenteditable]")) return false;
      // Let independently scrolling panels keep their own touch behavior.
      for (let node = target; node && node !== document.body; node = node.parentElement) {
        const overflow = getComputedStyle(node).overflowY;
        if (/auto|scroll/.test(overflow) && node.scrollHeight > node.clientHeight) return false;
      }
      return true;
    };
    const start = (event: TouchEvent) => {
      if (event.touches.length !== 1 || !canStart(event)) return;
      window.clearTimeout(wheelTimer);
      wheelTravel = 0;
      const touch = event.touches[0];
      origin = { x: touch.clientX, y: touch.clientY };
      pull = 0;
      dragging = false;
    };
    const move = (event: TouchEvent) => {
      if (!origin) return;
      if (event.touches.length !== 1 || window.scrollY > 0) {
        reset();
        return;
      }
      const touch = event.touches[0];
      const dy = touch.clientY - origin.y;
      const dx = Math.abs(touch.clientX - origin.x);
      if (!dragging) {
        if (dy < -8 || dx > 12 && dx > dy) {
          reset();
          return;
        }
        if (dy < 8 || dy < dx * 1.2) return;
        dragging = true;
      }
      if (!event.cancelable) {
        reset();
        return;
      }
      event.preventDefault();
      pull = resistedDistance(dy);
      setPulling(true);
      setDistance(pull);
    };
    const end = () => {
      if (refreshingRef.current) return;
      if (dragging && pull >= THRESHOLD && window.scrollY <= 0 && !refreshingRef.current && !document.querySelector("dialog[open]")) {
        refreshingRef.current = true;
        setSpinStart(pull * 5);
        setRefreshing(true);
        setReadyToSettle(false);
        setPulling(false);
        setDistance(THRESHOLD);
        // Update the current page without remounting the app or flashing the screen.
        frame = window.requestAnimationFrame(() => {
          startTransition(() => router.refresh());
          settleTimer = window.setTimeout(() => setReadyToSettle(true), 220);
        });
        origin = null;
        dragging = false;
        pull = 0;
        wheelTravel = 0;
      } else reset();
    };
    const mouseStart = (event: MouseEvent) => {
      if (event.button !== 0 || !canStart(event)) return;
      window.clearTimeout(wheelTimer);
      wheelTravel = 0;
      mouseDown = true;
      origin = { x: event.clientX, y: event.clientY };
      pull = 0;
      dragging = false;
    };
    const mouseMove = (event: MouseEvent) => {
      if (!mouseDown || !origin) return;
      if (window.scrollY > 0 || event.buttons !== 1) {
        mouseDown = false;
        reset();
        return;
      }
      const dy = event.clientY - origin.y;
      const dx = Math.abs(event.clientX - origin.x);
      if (!dragging && (dy < -8 || (dx > 12 && dx > dy))) {
        mouseDown = false;
        reset();
        return;
      }
      if (!dragging && (dy < 8 || dy < dx * 1.2)) return;
      dragging = true;
      event.preventDefault();
      window.getSelection()?.removeAllRanges();
      pull = resistedDistance(dy);
      setPulling(true);
      setDistance(pull);
    };
    const mouseEnd = () => {
      if (!mouseDown) return;
      mouseDown = false;
      end();
    };
    const wheel = (event: WheelEvent) => {
      if (mouseDown || origin || !canStart(event) || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      if (event.deltaY >= 0) {
        window.clearTimeout(wheelTimer);
        reset();
        return;
      }
      if (event.cancelable) event.preventDefault();
      const pixels = -event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
      wheelTravel += pixels;
      pull = resistedDistance(wheelTravel);
      dragging = true;
      setPulling(true);
      setDistance(pull);
      window.clearTimeout(wheelTimer);
      // A trackpad has no release event: refresh when upward scrolling stops.
      wheelTimer = window.setTimeout(end, 180);
    };
    const cancel = () => {
      mouseDown = false;
      window.clearTimeout(wheelTimer);
      if (!refreshingRef.current) reset();
    };

    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end, { passive: true });
    window.addEventListener("touchcancel", cancel, { passive: true });
    window.addEventListener("mousedown", mouseStart);
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup", mouseEnd);
    window.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", cancel);
      window.removeEventListener("mousedown", mouseStart);
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseup", mouseEnd);
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("blur", cancel);
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      window.clearTimeout(wheelTimer);
    };
  }, [router, startTransition]);

  const ready = distance >= THRESHOLD;
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 flex justify-center overflow-hidden"
        style={{ height: distance, opacity: Math.min(1, distance / 36), transition: pulling ? "none" : `height ${SETTLE}, opacity ${SETTLE}` }}>
        <div role="status" className="absolute flex h-9 w-9 items-center justify-center rounded-full text-ink"
          style={{ top: 0, transform: `translateY(${Math.max(0, (distance - 36) / 2)}px)`, transition: pulling ? "none" : `transform ${SETTLE}` }}>
          <span aria-hidden="true" style={{ transform: `rotate(${refreshing ? spinStart : distance * 5}deg)` }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
              className={refreshing ? "animate-spin motion-reduce:animate-none" : ""}
              style={{ animationDuration: "900ms" }}>
              <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" opacity="0.15" />
              <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                strokeDasharray="32 51" transform="rotate(-90 12 12)" />
            </svg>
          </span>
          <span className="sr-only">{refreshing ? "Refreshing…" : ready ? "Release to refresh" : "Pull to refresh"}</span>
        </div>
      </div>
      <div className="motion-reduce:transition-none" style={{
        transform: distance > 0 ? `translateY(${distance}px)` : undefined,
        transition: pulling ? "none" : `transform ${SETTLE}`,
      }}>
        {children}
      </div>
    </>
  );
}
