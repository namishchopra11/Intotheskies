"use client";

import { useEffect, useRef, useState } from "react";
import { BrandMark } from "./Brand";
import { Icon } from "./Icon";

type NotificationBannerProps = {
  title: string;
  lines: string[];
  /** The small label beside the title, like a phone notification's time. */
  meta?: string;
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
export function NotificationBanner({ title, lines, meta = "now", onOpen, onDismiss, autoHideMs = 5000 }: NotificationBannerProps) {
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
        {/* Compact, like a phone notification: one title line and at most two lines of text.
            The full story is one tap away on the plan. */}
        <div className="flex items-center gap-2.5 rounded-[16px] border border-line bg-surface py-2 pr-1 pl-2.5 shadow-[0_10px_28px_rgb(0_0_0/0.22)]">
          <button
            type="button"
            onClick={() => !moved.current && leave(onOpen)}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
          >
            <BrandMark size={30} className="rounded-[7px]" />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="min-w-0 flex-1 truncate text-[14px] leading-snug font-semibold text-ink">{title}</span>
                <span className="shrink-0 text-[12px] text-ink-2">{meta}</span>
              </span>
              <span className="line-clamp-2 text-[13px] leading-snug text-ink-body">{lines.join(" ")}</span>
            </span>
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => leave(onDismiss)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-sunk"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
