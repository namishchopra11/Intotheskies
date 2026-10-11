"use client";

import { useEffect, useState, type ReactNode } from "react";

// Matches the .ck-collapse transition in globals.css.
const FOLD_MS = 340;

type CollapseProps = {
  open: boolean;
  children: ReactNode;
  /** Point the toggle's aria-controls here. */
  id?: string;
  className?: string;
};

/**
 * A section that unfolds under the button that toggles it and folds back up when closed.
 * The content stays on the page until it has folded away, and can't be focused while closed.
 */
export function Collapse({ open, children, id, className }: CollapseProps) {
  // Rendered: true from opening until the fold-away has played. Settled: fully open.
  const [rendered, setRendered] = useState(open);
  const [settled, setSettled] = useState(open);
  if (open && !rendered) setRendered(true);
  if (!open && settled) setSettled(false);

  useEffect(() => {
    const t = setTimeout(() => (open ? setSettled(true) : setRendered(false)), FOLD_MS);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <div id={id} className="ck-collapse" data-open={open} data-settled={settled} inert={!open}>
      {/* Padding goes on the inner box, so nothing is left showing when folded. */}
      <div>{rendered && <div className={className}>{children}</div>}</div>
    </div>
  );
}
