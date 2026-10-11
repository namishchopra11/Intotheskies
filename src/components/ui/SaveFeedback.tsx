"use client";

import { useEffect } from "react";
import { useFeedback } from "@/lib/feedback";
import { Icon } from "./Icon";

export function SaveFeedback() {
  const saved = useFeedback((s) => s.saved);
  const undo = useFeedback((s) => s.undo);
  const dismiss = useFeedback((s) => s.dismiss);

  useEffect(() => {
    if (!saved && !undo) return;
    const timer = window.setTimeout(dismiss, undo ? 10000 : saved?.durable ? 2400 : 8000);
    return () => window.clearTimeout(timer);
  }, [saved, undo, dismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[max(env(safe-area-inset-bottom),88px)] z-[80] mx-auto max-w-[488px]" role="status" aria-live="polite" aria-atomic="true">
      {(saved || undo) && (
        <div className="ck-rise pointer-events-auto flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-lg">
          <Icon name={saved?.durable === false ? "alert" : "check"} size={18} className="shrink-0" />
          <div className="min-w-0 flex-1 text-[14px]">
            {undo ? <p className="font-medium">{undo.label}</p> : <p className="font-medium">{saved?.durable ? "Saved on this phone" : "Saved for this visit only"}</p>}
            {saved?.durable === false && <p className="mt-0.5 text-[12px] text-ink-2">Browser storage is unavailable. Changes may be lost when you leave.</p>}
          </div>
          {undo && <button type="button" onClick={() => { undo.run(); dismiss(); }} className="min-h-11 shrink-0 cursor-pointer rounded-control px-3 text-[14px] font-semibold underline underline-offset-4 hover:bg-sunk">Undo</button>}
          <button type="button" aria-label="Dismiss save message" onClick={dismiss} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control hover:bg-sunk"><Icon name="x" size={16} /></button>
        </div>
      )}
    </div>
  );
}
