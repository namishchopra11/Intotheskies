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
const CLOSE_MS = 200;

export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointer: number; start: number; y: number; time: number; distance: number; speed: number } | null>(null);
  const ignoreHandleClick = useRef(false);
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
    panelRef.current?.style.removeProperty("--sheet-drag");
    panelRef.current?.style.removeProperty("--sheet-close-y");
    if (panelRef.current) delete panelRef.current.dataset.dragging;
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

  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0 || leaving.current) return;
    ignoreHandleClick.current = false;
    drag.current = { pointer: event.pointerId, start: event.clientY, y: event.clientY, time: event.timeStamp, distance: 0, speed: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    if (panelRef.current) panelRef.current.dataset.dragging = "true";
  };
  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    const elapsed = event.timeStamp - current.time;
    current.speed = elapsed > 0 ? (event.clientY - current.y) / elapsed : 0;
    current.y = event.clientY;
    current.time = event.timeStamp;
    current.distance = Math.max(0, event.clientY - current.start);
    panelRef.current?.style.setProperty("--sheet-drag", `${current.distance}px`);
  };
  const endDrag = (event: PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const current = drag.current;
    const panel = panelRef.current;
    if (!current || current.pointer !== event.pointerId || !panel) return;
    drag.current = null;
    ignoreHandleClick.current = cancelled || current.distance > 6;
    delete panel.dataset.dragging;
    const height = panel.getBoundingClientRect().height;
    const recentSpeed = event.timeStamp - current.time < 120 ? current.speed : 0;
    const threshold = Math.min(100, Math.max(60, height * 0.22));
    if (!cancelled && (current.distance >= threshold || (current.distance > 20 && recentSpeed > 0.6))) {
      // Continue offscreen from the released position instead of jumping back before closing.
      panel.style.setProperty("--sheet-close-y", `${Math.max(40, height - current.distance + 24)}px`);
      requestClose();
    } else panel.style.setProperty("--sheet-drag", "0px");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
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
      <div ref={panelRef} className="ck-sheet-panel flex max-h-[90dvh] flex-col rounded-t-sheet border border-b-0 border-line bg-surface">
        <button type="button" aria-label="Drag down or tap to close" className="flex h-7 w-full shrink-0 touch-none cursor-grab items-center justify-center rounded-t-sheet select-none active:cursor-grabbing"
          onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={(event) => endDrag(event)}
          onPointerCancel={(event) => endDrag(event, true)} onLostPointerCapture={(event) => endDrag(event, true)}
          onClick={() => { if (!ignoreHandleClick.current) requestClose(); ignoreHandleClick.current = false; }}>
          <span aria-hidden="true" className="h-1.5 w-10 rounded-full bg-line-strong" />
        </button>
        <div className="flex items-center gap-2 py-1 pr-2 pl-5">
          <h2 id={titleId} className="flex-1 text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-2 hover:bg-sunk"
          >
            <Icon name="x" size={22} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && (
          <div className="border-t border-line px-5 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
            {footer}
          </div>
        )}
        {!footer && <div className="pb-[env(safe-area-inset-bottom)]" />}
      </div>
    </dialog>
  );
}
