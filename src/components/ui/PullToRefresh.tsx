"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

const THRESHOLD = 52;
// How long one crossing of the plane takes: the expected refresh time, within these limits.
const FLIGHT_MIN_MS = 600;
const FLIGHT_MAX_MS = 3000;
const FLIGHT_DEFAULT_MS = 800;
const REFRESH_MS_KEY = "layover:refresh-ms";
const SETTLE = "240ms cubic-bezier(0.22, 1, 0.36, 1)";

// A short buzz where the device supports it (Android; iOS Safari has no vibration API).
const buzz = (ms: number) => {
  if (typeof navigator !== "undefined") navigator.vibrate?.(ms);
};

// A refresh cannot be timed before it runs, so expect it to take about as long as recent ones
// did on this device (a running average, kept in localStorage), plus a little headroom.
const readRefreshMs = () => {
  try {
    const saved = Number(window.localStorage.getItem(REFRESH_MS_KEY));
    return Number.isFinite(saved) && saved > 0 ? saved : null;
  } catch {
    return null;
  }
};
const predictFlightMs = () => {
  const expected = readRefreshMs();
  if (expected === null) return FLIGHT_DEFAULT_MS;
  return Math.round(Math.min(FLIGHT_MAX_MS, Math.max(FLIGHT_MIN_MS, expected * 1.15)));
};
const recordRefreshMs = (took: number) => {
  const before = readRefreshMs();
  try {
    window.localStorage.setItem(REFRESH_MS_KEY, String(Math.round(before === null ? took : before * 0.6 + took * 0.4)));
  } catch {
    // Private mode or storage full: the next refresh uses the default.
  }
};

// Keep moving without a hard limit, while each extra pixel takes more effort.
const resistedDistance = (pixels: number) => 80 * Math.log1p(Math.max(0, pixels) / 200);

/** Refresh from the top with touch, a mouse drag, or an upward trackpad scroll. */
export function PullToRefresh({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [distance, setDistance] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [readyToSettle, setReadyToSettle] = useState(false);
  const [flightMs, setFlightMs] = useState(FLIGHT_DEFAULT_MS);
  const refreshingRef = useRef(false);
  const pendingSince = useRef(0);

  // Time each refresh so the next one's flight can be planned from it.
  useEffect(() => {
    if (pending) pendingSince.current = performance.now();
    else if (pendingSince.current) {
      recordRefreshMs(performance.now() - pendingSince.current);
      pendingSince.current = 0;
    }
  }, [pending]);

  // Fly once. If the request takes longer, wait for it without restarting the plane.
  useEffect(() => {
    if (!refreshing) return;
    const landing = window.setTimeout(() => setReadyToSettle(true), flightMs + 100);
    return () => window.clearTimeout(landing);
  }, [refreshing, flightMs]);

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
    let wheelTimer = 0;
    let mouseDown = false;
    let lastWheelAt = 0;
    let wheelLocked = false;
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
        wheelLocked = true;
        buzz(20);
        setFlightMs(predictFlightMs());
        setRefreshing(true);
        setReadyToSettle(false);
        setPulling(false);
        setDistance(THRESHOLD);
        // Update the current page without remounting the app or flashing the screen.
        frame = window.requestAnimationFrame(() => startTransition(() => router.refresh()));
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
      const now = performance.now();
      // Inertial trackpad events belong to the same pull, not another refresh.
      if (refreshingRef.current || (wheelLocked && now - lastWheelAt < 240)) {
        lastWheelAt = now;
        return;
      }
      wheelLocked = false;
      lastWheelAt = now;
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
      window.clearTimeout(wheelTimer);
    };
  }, [router, startTransition]);

  const ready = distance >= THRESHOLD;
  // One tick as the pull passes the point where letting go refreshes.
  useEffect(() => {
    if (ready && pulling) buzz(10);
  }, [ready, pulling]);
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 flex justify-center overflow-hidden"
        style={{ height: distance, opacity: Math.min(1, distance / 36), transition: pulling ? "none" : `height ${SETTLE}, opacity ${SETTLE}` }}>
        {/* Pulling positions the plane; releasing starts exactly one accelerating flight. */}
        <div role="status" className="absolute inset-x-0 mx-auto h-9 max-w-[520px] overflow-hidden text-ink"
          style={{ top: 0, transform: `translateY(${Math.max(0, (distance - 36) / 2)}px)`, transition: pulling ? "none" : `transform ${SETTLE}` }}>
          <div aria-hidden="true" key={refreshing ? "refresh" : "pull"}
            className={`absolute inset-0 ${refreshing ? "ck-ptr-fly" : ""}`}
            onAnimationEnd={(event) => {
              if (refreshing && event.target === event.currentTarget && event.animationName === "ck-ptr-cross") setReadyToSettle(true);
            }}
            style={{ transform: `translateX(${15 + Math.min(distance / THRESHOLD, 1) * 30}%)`, animationDuration: `${flightMs}ms` }}>
            <span className="absolute right-full top-1/2 mr-4 w-2/5 border-t-2 border-dashed border-current opacity-40"
              style={{ maskImage: "linear-gradient(to right, transparent, #000)", WebkitMaskImage: "linear-gradient(to right, transparent, #000)" }} />
            <svg viewBox="0 0 24 24" width="24" height="24" fill="var(--signal)" stroke="currentColor"
              strokeWidth="1.25" strokeLinejoin="round" className="absolute left-0 top-1/2 -ml-3 -mt-3"
              style={{ transform: `rotate(${ready || refreshing ? -10 : 0}deg)`, transition: "transform 160ms ease-out" }}>
              <path d="M16 10h4a2 2 0 0 1 0 4h-4l-4 7H9l2-7H7l-2 2H2l2-4-2-4h3l2 2h4L9 3h3z" />
            </svg>
          </div>
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
