"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

const THRESHOLD = 72;

/** Refresh from the top with touch, a mouse drag, or an upward trackpad scroll. */
export function PullToRefresh({ children }: { children: ReactNode }) {
  const [distance, setDistance] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    let origin: { x: number; y: number } | null = null;
    let pull = 0;
    let dragging = false;
    let frame = 0;
    let reloadTimer = 0;
    let settleTimer = 0;
    let wheelTimer = 0;
    let mouseDown = false;
    const reset = () => {
      origin = null;
      dragging = false;
      pull = 0;
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
      pull = Math.min(108, Math.max(0, dy * 0.5));
      setPulling(true);
      setDistance(pull);
    };
    const end = () => {
      if (dragging && pull >= THRESHOLD && window.scrollY <= 0 && !refreshingRef.current && !document.querySelector("dialog[open]")) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPulling(false);
        setDistance(THRESHOLD);
        // Paint the spinner before a real reload; saved trips remain in localStorage.
        frame = window.requestAnimationFrame(() => {
          settleTimer = window.setTimeout(() => setDistance(0), 450);
          reloadTimer = window.setTimeout(() => window.location.reload(), 800);
        });
        origin = null;
        dragging = false;
      } else reset();
    };
    const mouseStart = (event: MouseEvent) => {
      if (event.button !== 0 || !canStart(event)) return;
      window.clearTimeout(wheelTimer);
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
      pull = Math.min(108, Math.max(0, dy * 0.5));
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
      pull = Math.min(108, pull + pixels * 0.5);
      dragging = true;
      setPulling(true);
      setDistance(pull);
      window.clearTimeout(wheelTimer);
      // A trackpad has no release event: refresh when upward scrolling stops.
      wheelTimer = window.setTimeout(end, 350);
    };
    const cancel = () => {
      mouseDown = false;
      window.clearTimeout(wheelTimer);
      if (!refreshingRef.current) reset();
    };

    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end, { passive: true });
    window.addEventListener("touchcancel", reset, { passive: true });
    window.addEventListener("mousedown", mouseStart);
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup", mouseEnd);
    window.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", reset);
      window.removeEventListener("mousedown", mouseStart);
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseup", mouseEnd);
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("blur", cancel);
      window.cancelAnimationFrame(frame);
      window.clearTimeout(reloadTimer);
      window.clearTimeout(settleTimer);
      window.clearTimeout(wheelTimer);
    };
  }, []);

  const ready = distance >= THRESHOLD;
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 flex justify-center overflow-hidden"
        style={{ height: distance, opacity: Math.min(1, distance / 36), transition: pulling ? "none" : "height 300ms ease, opacity 300ms ease" }}>
        <div role="status" className="absolute flex h-9 w-9 items-center justify-center rounded-full text-ink"
          style={{ top: Math.max(0, (distance - 36) / 2) }}>
          <Icon name="refresh" size={22} className={refreshing ? "animate-spin motion-reduce:animate-none" : ""}
            style={refreshing ? undefined : { transform: `rotate(${distance * 5}deg)` }} aria-hidden="true" />
          <span className="sr-only">{refreshing ? "Refreshing…" : ready ? "Release to refresh" : "Pull to refresh"}</span>
        </div>
      </div>
      <div className="motion-reduce:transition-none" style={{
        transform: distance > 0 ? `translateY(${distance}px)` : undefined,
        transition: pulling ? "none" : "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}>
        {children}
      </div>
    </>
  );
}
