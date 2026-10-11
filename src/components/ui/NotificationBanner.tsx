"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  /** Hides itself after this long unless held or expanded. 0 keeps it up. */
  autoHideMs?: number;
};

const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";

/**
 * A banner that drops in from the top of the screen, like a phone notification.
 * Tap to open, drag it down to read all of it, drag it up or press the cross to dismiss.
 */
export function NotificationBanner({ title, lines, meta = "now", onOpen, onDismiss, autoHideMs = 10000 }: NotificationBannerProps) {
  const [leaving, setLeaving] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  // Dragging down drops the line clamps and grows the text block's max-height from its clamped
  // height (`size.from`) to the whole message (`size.to`) with the finger.
  const [unclamped, setUnclamped] = useState(false);
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined);
  const text = useRef<HTMLSpanElement>(null);
  const size = useRef({ from: 0, to: 0 });
  // The gesture lives in refs: moves can arrive faster than renders.
  const start = useRef<number | null>(null);
  const live = useRef<{ dy: number; pull: number | null }>({ dy: 0, pull: null });
  const moved = useRef(false);
  const expired = useRef(false);
  const expanded = useRef(false);
  const gone = useRef(false);

  // Only the first way out counts (a tap that lands just as it times out, say).
  const leave = (then: () => void) => {
    if (gone.current) return;
    gone.current = true;
    setLeaving(true);
    setTimeout(then, 260);
  };

  // Hides itself after autoHideMs; if a finger is on it then, it goes once that finger lifts.
  // Once expanded it stays until dismissed: the traveler is reading it.
  useEffect(() => {
    if (!autoHideMs) return;
    const t = setTimeout(() => {
      expired.current = true;
      if (start.current === null && !expanded.current) leave(onDismiss);
    }, autoHideMs);
    return () => clearTimeout(t);
  }, [autoHideMs, onDismiss]);

  // With the clamps off, the text block's scroll height is the whole message.
  useLayoutEffect(() => {
    if (unclamped && text.current) size.current.to = text.current.scrollHeight;
  }, [unclamped]);

  const room = () => Math.max(0, size.current.to - size.current.from);

  const move = (y: number) => {
    if (start.current === null) return;
    const raw = y - start.current;
    if (!moved.current && Math.abs(raw) > 4) {
      moved.current = true;
      setDragging(true);
    }
    if (!moved.current) return;
    if (raw > 0 && !expanded.current) {
      // Down opens it up with the finger; past the full message it only gives a little.
      if (!size.current.from && text.current) {
        size.current = { from: text.current.offsetHeight, to: text.current.offsetHeight };
        setUnclamped(true);
      }
      live.current = { dy: Math.max(0, raw - room()) / 5, pull: raw };
      setMaxHeight(size.current.from + Math.min(raw, room()));
      setDragY(live.current.dy);
      return;
    }
    if (live.current.pull !== null && !expanded.current) {
      live.current.pull = 0;
      setMaxHeight(size.current.from);
    }
    // Up follows the finger; down (already open) only gives a little.
    live.current.dy = raw < 0 ? raw : raw / 5;
    setDragY(live.current.dy);
  };

  const end = (cancelled: boolean) => {
    const { dy, pull } = live.current;
    start.current = null;
    live.current = { dy: 0, pull: null };
    setDragging(false);
    if (pull !== null && !expanded.current) {
      if (!cancelled && pull > Math.min(30, room() * 0.3)) {
        expanded.current = true;
        // Next frame, so the clamps are surely off even after a quick flick.
        requestAnimationFrame(() => {
          if (text.current) setMaxHeight(text.current.scrollHeight);
        });
      } else {
        // Shrinks back to the clamped height, then puts the clamps (and their ellipsis) back.
        setMaxHeight(size.current.from);
        setTimeout(() => {
          if (expanded.current) return;
          size.current = { from: 0, to: 0 };
          setUnclamped(false);
          setMaxHeight(undefined);
        }, 220);
      }
    }
    if (!cancelled && moved.current && dy < -40) {
      // Leaves from where the finger let go: the outer layer stays put, the card slides on up.
      leave(onDismiss);
      return;
    }
    // Timed out while held: it goes now. After a plain tap the click handler goes first and
    // opens it instead.
    if (expired.current && !expanded.current) setTimeout(() => leave(onDismiss), 0);
    setDragY(0);
  };

  // The window listeners call whatever this render's handlers are.
  const handlers = useRef({ move, end });
  useLayoutEffect(() => {
    handlers.current = { move, end };
  });
  const stopListening = useRef<(() => void) | null>(null);
  useEffect(() => () => stopListening.current?.(), []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 mx-auto max-w-[520px] px-3 pt-[max(env(safe-area-inset-top),10px)]">
      {/* The drag moves this outer layer; the drop-in and fly-out animations run on the inner
          one, so the two transforms don't fight. */}
      <div
        className="pointer-events-auto touch-none select-none"
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragging ? "none" : `transform 220ms ${EASE}`,
        }}
        onPointerDown={(e) => {
          start.current = e.clientY;
          live.current = { dy: 0, pull: null };
          moved.current = false;
          // Followed on the window, so a mouse that leaves the card mid-drag still counts.
          // (Pointer capture would send a plain tap's click to this div instead of the buttons.)
          stopListening.current?.();
          const onMove = (ev: PointerEvent) => handlers.current.move(ev.clientY);
          const onUp = () => finish(false);
          const onCancel = () => finish(true);
          const finish = (cancelled: boolean) => {
            stopListening.current?.();
            handlers.current.end(cancelled);
          };
          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp);
          window.addEventListener("pointercancel", onCancel);
          stopListening.current = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onCancel);
            stopListening.current = null;
          };
        }}
      >
        <div role="alert" className={leaving ? "ck-notify-out" : "ck-notify-in"}>
          {/* Compact, like a phone notification: one title line and at most two lines of text.
              Drag down for the rest; the full story is one tap away on the plan. */}
          <div className="flex items-center gap-2.5 rounded-[16px] border border-line bg-surface py-2 pr-1 pl-2.5 shadow-[0_10px_28px_rgb(0_0_0/0.22)]">
            <button
              type="button"
              onClick={() => !moved.current && leave(onOpen)}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left"
            >
              <BrandMark size={30} className="rounded-[7px]" />
              <span
                ref={text}
                className="min-w-0 flex-1 overflow-hidden"
                style={{ maxHeight, transition: dragging ? "none" : `max-height 220ms ${EASE}` }}
              >
                <span className="flex items-baseline gap-2">
                  <span className={`min-w-0 flex-1 text-[14px] leading-snug font-semibold text-ink ${unclamped ? "" : "truncate"}`}>
                    {title}
                  </span>
                  <span className="shrink-0 text-[12px] text-ink-2">{meta}</span>
                </span>
                <span className={`text-[13px] leading-snug text-ink-body ${unclamped ? "block" : "line-clamp-2"}`}>
                  {lines.join(" ")}
                </span>
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
    </div>
  );
}
