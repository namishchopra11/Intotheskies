"use client";

import { useEffect, useState } from "react";
import { Icon, SignArrow, cx } from "@/components/ui";

const STEPS = ["Opening your files", "Finding your flights", "Matching hotels and rides", "Double-checking the times"];
const STEP_MS = 3500;

/** Shown while Claude reads the confirmations: a plane crossing a route, and steps ticking off. */
export function ReadingProgress({ fileCount }: { fileCount: number }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // The last step stays current until the answer arrives; it can take a while.
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), STEP_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div role="status" aria-live="polite" className="rounded-card bg-surface p-5">
      <style>{`
        @keyframes ck-read-fly {
          0% { left: 0%; opacity: 0; }
          12% { opacity: 1; }
          88% { opacity: 1; }
          100% { left: 100%; opacity: 0; }
        }
        @keyframes ck-read-bob {
          0%, 100% { transform: translate(-50%, -50%); }
          50% { transform: translate(-50%, calc(-50% - 3px)); }
        }
        .ck-read-plane { animation: ck-read-fly 2.8s ease-in-out infinite; }
        .ck-read-plane > span { animation: ck-read-bob 1.4s ease-in-out infinite; }
      `}</style>

      <div aria-hidden="true" className="relative mx-2 mb-5 h-10">
        <div className="absolute top-1/2 right-0 left-0 h-1 -translate-y-1/2 bg-sunk" />
        <span className="absolute top-1/2 left-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-ink" />
        <span className="absolute top-1/2 right-0 h-3 w-3 translate-x-1/2 -translate-y-1/2 rounded-[2px] bg-ink" />
        <div className="ck-read-plane absolute top-1/2">
          <span className="absolute inline-flex h-9 w-9 items-center justify-center rounded-[3px] bg-sign text-on-sign">
            <SignArrow size={20} />
          </span>
        </div>
      </div>

      <p className="mb-3 text-center font-display text-[26px] leading-none font-bold">
        Reading {fileCount > 1 ? `your ${fileCount} files` : "your booking"}…
      </p>

      <ol className="mx-auto flex max-w-[260px] flex-col gap-2 text-[15px]">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={cx(
              "flex items-center gap-2 transition-colors duration-300",
              i < step ? "text-ok-fg" : i === step ? "font-bold text-ink" : "text-ink-2 opacity-60",
            )}
          >
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
              {i < step ? (
                <Icon name="check" size={16} strokeWidth={3} />
              ) : i === step ? (
                <span className="ck-pulse h-2.5 w-2.5 rounded-[2px] bg-current" />
              ) : (
                <span className="h-2 w-2 rounded-[2px] bg-current" />
              )}
            </span>
            {label}
          </li>
        ))}
      </ol>

      <p className="mt-4 text-center text-[14px] font-medium text-ink-2">This can take up to a minute.</p>
    </div>
  );
}
