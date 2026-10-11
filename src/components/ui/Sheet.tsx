"use client";

import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from "react";
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
      <div className="ck-sheet-panel flex max-h-[90dvh] flex-col rounded-t-sheet border border-b-0 border-line bg-surface">
        <div className="flex justify-center pt-2.5" aria-hidden="true">
          <span className="h-1.5 w-10 rounded-full bg-line-strong" />
        </div>
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
