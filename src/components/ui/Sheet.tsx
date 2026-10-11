"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
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
 * the dimmed backdrop close it, and the page behind can't scroll.
 */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // True while this sheet is meant to be showing. A close the sheet does itself on cleanup
  // happens while this is false, so it isn't reported as the user closing it.
  const active = useRef(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (!open) {
      if (d.open) d.close();
      return;
    }
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
      if (d.open) d.close();
    };
  }, [open]);

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
      onClick={(e) => {
        // A click on the <dialog> itself (not its panel) is a click on the backdrop.
        if (e.target === ref.current) onClose();
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
            onClick={onClose}
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
