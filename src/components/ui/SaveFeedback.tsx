"use client";

import { useEffect } from "react";
import { useFeedback } from "@/lib/feedback";
import { Icon } from "./Icon";

export function SaveFeedback() {
  const undo = useFeedback((s) => s.undo);
  const dismiss = useFeedback((s) => s.dismiss);

  useEffect(() => {
    if (!undo) return;
    const timer = window.setTimeout(dismiss, 10000);
    return () => window.clearTimeout(timer);
  }, [undo, dismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[max(env(safe-area-inset-bottom),88px)] z-[80] mx-auto max-w-[488px]" role="status" aria-live="polite" aria-atomic="true">
      {undo && (
        <div className="ck-rise pointer-events-auto flex items-center gap-3 rounded-card bg-plate py-2 pr-1.5 pl-2 text-on-plate shadow-float">
          <span aria-hidden="true" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] bg-sign text-on-sign"><Icon name="check" size={18} strokeWidth={3} /></span>
          <div className="min-w-0 flex-1 text-[15px]">
            <p className="font-semibold">{undo.label}</p>
          </div>
          {undo && <button type="button" onClick={() => { undo.run(); dismiss(); }} className="ck-press min-h-11 shrink-0 cursor-pointer rounded-control px-3 text-[15px] font-bold text-sign underline underline-offset-4">Undo</button>}
          <button type="button" aria-label="Dismiss undo message" onClick={dismiss} className="ck-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control"><Icon name="x" size={18} strokeWidth={2.5} /></button>
        </div>
      )}
    </div>
  );
}
