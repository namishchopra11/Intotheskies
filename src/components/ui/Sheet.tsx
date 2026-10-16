"use client";

import { useEffect, useId, useLayoutEffect, useRef, type PointerEvent, type ReactNode } from "react";
import { Icon } from "./Icon";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Optional sticky footer, e.g. a primary Button. */
  footer?: ReactNode;
};

/**
 * Bottom sheet built on the native <dialog>: focus is trapped inside, Escape and a tap on
 * the dimmed backdrop close it, and the page behind can't scroll. It slides up to open and
 * back down to close.
 */
// Matches the ck-sheet-down animation in globals.css.
const CLOSE_MS = 220;

export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // True while this sheet is meant to be showing. A close the sheet does itself on cleanup
  // happens while this is false, so it isn't reported as the user closing it.
  const active = useRef(false);
  // The latest `open`, so a cleanup can tell "about to close" from "page hidden or gone".
  const openRef = useRef(open);
  // True once the slide-down has already played for a close the user asked for.
  const leaving = useRef(false);

  useLayoutEffect(() => {
    openRef.current = open;
  });

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!open) {
      if (!d.open) return;
      if (leaving.current) {
        leaving.current = false;
        delete d.dataset.closing;
        d.close();
        return;
      }
      // Closed from outside (a button in the sheet): slide down first, then close.
      d.dataset.closing = "true";
      const t = setTimeout(() => d.close(), CLOSE_MS);
      return () => {
        clearTimeout(t);
        delete d.dataset.closing;
        if (d.open) d.close();
      };
    }
    delete d.dataset.closing;
    if (!d.open) d.showModal();
    active.current = true;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      active.current = false;
      root.style.overflow = prev;
      // Next keeps a page you leave alive in the background. A modal left open there sits in
      // the top layer with no layout and comes back pinned to the top of the screen, and
      // scrolling stays locked. Close it here; it reopens cleanly if `open` is still true.
      // When `open` just turned false, leave it up so the run above can slide it down.
      if (openRef.current && d.open) d.close();
    };
  }, [open]);

  // X, the backdrop or Escape: slide down, then tell the parent.
  const requestClose = () => {
    const d = ref.current;
    if (!d || leaving.current) return;
    leaving.current = true;
    d.dataset.closing = "true";
    setTimeout(() => {
      onClose();
      // If the parent kept it open after all, bring the panel back.
      requestAnimationFrame(() => {
        if (openRef.current && d.open) {
          leaving.current = false;
          delete d.dataset.closing;
        }
      });
    }, CLOSE_MS);
  };

  // Drag the handle or title row down to dismiss: follows the finger 1:1, rubber-bands upward,
  // and a quick flick closes it even when it hasn't travelled far.
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; t: number; dy: number; v: number } | null>(null);
  const onPointerDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    drag.current = { y: e.clientY, t: performance.now(), dy: 0, v: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (panel.current) panel.current.style.transition = "none";
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || !panel.current) return;
    const raw = e.clientY - d.y;
    const now = performance.now();
    d.v = (raw - d.dy) / Math.max(1, now - d.t);
    d.t = now;
    d.dy = raw;
    const y = raw < 0 ? -Math.sqrt(-raw) * 2 : raw;
    panel.current.style.transform = `translateY(${y}px)`;
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    const p = panel.current;
    if (!d || !p) return;
    p.style.transition = "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)";
    if (d.dy > 120 || (d.dy > 16 && d.v > 0.5)) {
      p.style.transform = "translateY(100%)";
      // The panel is already on its way down: skip the CSS slide and just close.
      leaving.current = true;
      setTimeout(() => {
        onClose();
        p.style.transform = "";
        p.style.transition = "";
      }, 260);
    } else {
      p.style.transform = "";
    }
  };

  return (
    <dialog
      ref={ref}
      className="ck-sheet"
      aria-labelledby={titleId}
      onClose={() => {
        // The close event arrives a moment later. Ignore it if the sheet closed itself on
        // cleanup, or was shown again since (React runs effects twice in development).
        if (!active.current || ref.current?.open) return;
        onClose();
      }}
      onCancel={(e) => {
        // Escape: play the slide-down instead of vanishing.
        e.preventDefault();
        requestClose();
      }}
      onClick={(e) => {
        // A click on the <dialog> itself (not its panel) is a click on the backdrop.
        if (e.target === ref.current) requestClose();
      }}
    >
      <div
        ref={panel}
        className="ck-sheet-panel flex max-h-[92dvh] flex-col rounded-t-sheet bg-bg shadow-float"
      >
        <div
          className="touch-none cursor-grab select-none active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="flex justify-center pt-2.5" aria-hidden="true">
            <span className="h-[5px] w-10 rounded-[2px] bg-line-strong" />
          </div>
          <div className="flex items-center gap-2 pt-2 pr-3 pb-2 pl-5">
            <h2 id={titleId} className="flex-1 font-display text-[30px] leading-none font-bold">
              {title}
            </h2>
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close"
              className="ck-press inline-flex h-11 w-11 items-center justify-center rounded-control text-ink"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-sunk">
                <Icon name="x" size={16} strokeWidth={2.5} />
              </span>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && (
          <div className="bg-bg px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
            {footer}
          </div>
        )}
        {!footer && <div className="pb-[env(safe-area-inset-bottom)]" />}
      </div>
    </dialog>
  );
}
