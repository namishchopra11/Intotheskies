"use client";

import { useEffect, useRef, useState } from "react";
import { BrandMark } from "./Brand";
import { Icon } from "./Icon";

type NotificationBannerProps = {
  title: string;
  lines: string[];
  /** Tapping the card. */
  onOpen: () => void;
  onDismiss: () => void;
  /** Hides itself after this long unless touched or focused. 0 keeps it up. */
  autoHideMs?: number;
};

/**
 * A banner that drops in from the top of the screen, like a phone notification.
 * Tap to open, swipe up or press the cross to dismiss.
 */
export function NotificationBanner({ title, lines, onOpen, onDismiss, autoHideMs = 9000 }: NotificationBannerProps) {
  const [leaving, setLeaving] = useState(false);
  const [dragY, setDragY] = useState(0);
  const start = useRef<number | null>(null);
  const paused = useRef(false);
  const moved = useRef(false);

  const leave = (then: () => void) => {
    setLeaving(true);
    setTimeout(then, 260);
  };

  useEffect(() => {
    if (!autoHideMs) return;
    const t = setTimeout(() => {
      if (!paused.current) leave(onDismiss);
    }, autoHideMs);
    return () => clearTimeout(t);
  }, [autoHideMs, onDismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 mx-auto max-w-[520px] px-3 pt-[max(env(safe-area-inset-top),10px)]">
      <div
        role="alert"
        className={`pointer-events-auto ${leaving ? "ck-notify-out" : "ck-notify-in"}`}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}
        onPointerDown={(e) => {
          start.current = e.clientY;
          moved.current = false;
          paused.current = true;
        }}
        onPointerMove={(e) => {
          if (start.current === null) return;
          const dy = Math.min(0, e.clientY - start.current);
          if (dy < -4) moved.current = true;
          setDragY(dy);
        }}
        onPointerUp={() => {
          const dy = dragY;
          start.current = null;
          setDragY(0);
          if (dy < -40) leave(onDismiss);
        }}
        onPointerCancel={() => {
          start.current = null;
          setDragY(0);
        }}
        onFocus={() => (paused.current = true)}
      >
        <div className="flex items-start gap-3 rounded-[18px] border border-line bg-surface p-3.5 shadow-[0_12px_32px_rgb(0_0_0/0.22)]">
          <button
            type="button"
            onClick={() => !moved.current && leave(onOpen)}
            className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left"
          >
            <BrandMark size={38} className="rounded-[9px]" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-num text-[11px] font-semibold tracking-[0.06em] text-ink-2 uppercase">
                Layover
                <span aria-hidden="true">·</span>
                <span className="font-normal tracking-normal normal-case">now</span>
              </span>
              <span className="mt-0.5 block text-[15px] leading-snug font-semibold text-ink">{title}</span>
              <span className="mt-1 flex flex-col gap-0.5 text-[14px] leading-snug text-ink-body">
                {lines.map((l, i) => (
                  <span key={i}>{l}</span>
                ))}
              </span>
            </span>
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => leave(onDismiss)}
            className="-mt-1.5 -mr-1.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-sunk"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
